import { z } from 'zod'
import type { LLMClient, SchedulingContext, MessageType } from '../types/index.js'
import { ValidationError, LLMParseError } from '../utils/errors.js'

const VALID_MESSAGE_TYPES: MessageType[] = [
  'opening', 'statement', 'rebuttal', 'supplement', 'closing',
]

const SchedulingResponseSchema = z.object({
  panelist_id: z.string().min(1),
  type: z.string(),
})

function buildSystemPrompt(): string {
  return `你是一个圆桌讨论的调度员。根据当前讨论状态，决定下一位发言的嘉宾。

规则：
1. 分析所有嘉宾的角色和当前讨论进展，决定谁最应该下一个发言
2. 主持人(host)负责开场(opening)、串场追问、收尾总结(closing)
3. 专家(expert)进行观点陈述(statement)、补充(supplement)、反驳(rebuttal)
4. 非轮询制：哪位专家观点最需要被听到，就安排谁发言
5. 鼓励观点碰撞：如果最近发言存在可争议的点，优先安排持不同立场的专家反驳
6. 每位发言控制在 1-2 句话（约 50-150 字）
7. 如果讨论已经充分（通常 10-15 轮发言后），主持人可以做总结(closing)并结束讨论

严格以 JSON 格式返回（只做调度，不写发言内容）：
{"panelist_id": "嘉宾ID", "type": "opening|statement|rebuttal|supplement|closing"}`
}

function buildUserPrompt(ctx: SchedulingContext): string {
  const panelistList = ctx.panelists
    .map(p => `- id: ${p.id}, 姓名: ${p.name}, 角色: ${p.role}`)
    .join('\n')

  const history =
    ctx.messages.length > 0
      ? ctx.messages.map(m => `[${m.name}](${m.type}): ${m.content}`).join('\n')
      : '(讨论尚未开始，请主持人做开场发言)'

  return `讨论话题：${ctx.topic}

嘉宾列表：
${panelistList}

最近发言记录：
${history}

请决定下一位发言的嘉宾。`
}

function normalizeMessageType(type: string): MessageType {
  if (VALID_MESSAGE_TYPES.includes(type as MessageType)) {
    return type as MessageType
  }
  return 'statement'
}

function extractJson(response: string): string {
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new LLMParseError('LLM 返回中未找到 JSON 结构')
  }
  return jsonMatch[0]
}

function parseResponse(
  response: string,
  ctx: SchedulingContext
): { panelist_id: string; type: MessageType } {
  let data: unknown
  try {
    data = JSON.parse(extractJson(response))
  } catch {
    throw new LLMParseError('LLM 返回的 JSON 解析失败')
  }

  const result = SchedulingResponseSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new LLMParseError(`发言调度返回格式不符合预期: ${issues}`)
  }

  const { panelist_id, type } = result.data

  const validIds = ctx.panelists.map(p => p.id)
  if (!validIds.includes(panelist_id)) {
    throw new LLMParseError(`LLM 返回了不存在的嘉宾 ID: ${panelist_id}`)
  }

  return {
    panelist_id,
    type: normalizeMessageType(type),
  }
}

function checkConsecutiveRule(ctx: SchedulingContext, proposedPanelistId: string): void {
  if (ctx.messages.length < 2) return

  const lastTwo = ctx.messages.slice(-2)
  const samePanelist = lastTwo.every(m => m.panelist_id === proposedPanelistId)
  if (samePanelist) {
    throw new ValidationError('同一嘉宾不能连续发言超过 2 次')
  }
}

export async function decideNextSpeaker(
  ctx: SchedulingContext,
  llm: LLMClient
): Promise<{ panelist_id: string; type: MessageType }> {
  if (ctx.panelists.length === 0) {
    throw new ValidationError('嘉宾列表不能为空')
  }

  console.log('[discussion] 开始发言调度, topic:', ctx.topic, 'panelist_count:', ctx.panelists.length, 'msg_count:', ctx.messages.length)

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(ctx) },
  ]

  const response = await llm.chat(messages)
  const result = parseResponse(response, ctx)
  checkConsecutiveRule(ctx, result.panelist_id)

  console.log('[discussion] 发言调度完成, next:', result.panelist_id, 'type:', result.type)
  return result
}

// ===== 流式发言内容生成 =====

function buildSpeechSystemPrompt(): string {
  return `你正在参加一场圆桌讨论。根据你的角色和立场，针对当前话题发表观点。

要求：
1. 严格以第一人称发言，直接输出对话内容，不加引号、不署名、不加角色标注
2. 控制在 1-2 句话（约 50-150 字）
3. 语言自然、口语化，像是在真实对话
4. 根据你的立场和角色表达观点，可适当回应或反驳前面的发言
5. 只输出发言原文，不输出任何其他内容`
}

function buildSpeechUserPrompt(
  ctx: SchedulingContext,
  decision: { panelist_id: string; type: MessageType }
): string {
  const panelist = ctx.panelists.find(p => p.id === decision.panelist_id)
  if (!panelist) throw new ValidationError('未找到发言嘉宾')

  const history =
    ctx.messages.length > 0
      ? ctx.messages.slice(-8).map(m => `[${m.name}](${m.type}): ${m.content}`).join('\n')
      : '(讨论尚未开始，你是第一个发言)'

  const typeHint: Record<string, string> = {
    opening: '你是主持人，请做一个精彩的开场白，引出话题',
    closing: '你是主持人，请对讨论进行总结收尾',
    statement: '请陈述你的核心观点',
    rebuttal: '请针对最近的不同观点进行反驳',
    supplement: '请在已有讨论基础上补充你的见解',
  }

  return `讨论话题：${ctx.topic}

你的身份：
- 名字：${panelist.name}
- 角色：${panelist.role === 'host' ? '主持人' : '专家'}
- 头衔：${panelist.title}
- 立场：${panelist.stance}

发言类型：${decision.type} — ${typeHint[decision.type] || '请发表观点'}

最近讨论记录：
${history}

现在请你以 ${panelist.name} 的身份发言。只输出发言原文。`
}

export async function* generateSpeechStream(
  ctx: SchedulingContext,
  decision: { panelist_id: string; type: MessageType },
  llm: LLMClient
): AsyncGenerator<string> {
  const messages = [
    { role: 'system', content: buildSpeechSystemPrompt() },
    { role: 'user', content: buildSpeechUserPrompt(ctx, decision) },
  ]

  for await (const token of llm.streamChat(messages)) {
    yield token
  }
}

export async function generateSpeechContent(
  ctx: SchedulingContext,
  decision: { panelist_id: string; type: MessageType },
  llm: LLMClient
): Promise<string> {
  let content = ''
  for await (const token of generateSpeechStream(ctx, decision, llm)) {
    content += token
  }
  return content
}
