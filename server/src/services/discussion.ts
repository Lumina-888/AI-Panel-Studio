import { z } from 'zod'
import type { LLMClient, SchedulingContext, MessageType } from '../types/index.js'
import { ValidationError, LLMParseError } from '../utils/errors.js'

const VALID_MESSAGE_TYPES: MessageType[] = [
  'opening', 'statement', 'rebuttal', 'supplement', 'closing',
]

const SchedulingResponseSchema = z.object({
  panelist_id: z.string().min(1),
  type: z.string(),
  content: z.string().min(1),
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

严格以 JSON 格式返回：
{"panelist_id": "嘉宾ID", "type": "opening|statement|rebuttal|supplement|closing", "content": "发言内容"}`
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
): { panelist_id: string; type: MessageType; content: string } {
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

  const { panelist_id, type, content } = result.data

  const validIds = ctx.panelists.map(p => p.id)
  if (!validIds.includes(panelist_id)) {
    throw new LLMParseError(`LLM 返回了不存在的嘉宾 ID: ${panelist_id}`)
  }

  return {
    panelist_id,
    type: normalizeMessageType(type),
    content,
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
): Promise<{ panelist_id: string; type: MessageType; content: string }> {
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
