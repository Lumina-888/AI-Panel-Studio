import { z } from 'zod'
import type { LLMClient, ConsensusInput } from '../types/index.js'
import { LLMParseError } from '../utils/errors.js'

const ConsensusItemSchema = z.object({
  content: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

const DivergenceItemSchema = z.object({
  content: z.string().min(1),
  perspectives: z.array(z.string().min(1)).min(2),
})

const ConsensusResponseSchema = z.object({
  consensus: z.array(ConsensusItemSchema),
  divergence: z.array(DivergenceItemSchema),
})

function buildSystemPrompt(): string {
  return `你是一个圆桌讨论的共识和分歧分析器。分析最近的发言，提炼出：

1. 共识点(consensus)：各方趋于一致的观点，附带置信度(0-1)
   - 置信度基于赞同该观点的嘉宾比例估算
   - 如果某观点只有 1 人提出且无人回应，不要列为共识

2. 分歧点(divergence)：存在对立的观点，列出各方的不同立场
   - perspectives 至少包含 2 个不同立场
   - 每方立场用一句话概括

规则：
- 只提取发言中确实出现过的观点，不要凭空编造
- 如果近期发言没有新的共识或分歧，返回空数组
- 不要重复已有的共识/分歧（输入中提供了已有列表）
- 共识的 confidence 需根据发言中实际支持度合理估算

严格以 JSON 格式返回：
{"consensus": [{"content": "...", "confidence": 0.85}], "divergence": [{"content": "...", "perspectives": ["立场A", "立场B"]}]}`
}

function buildUserPrompt(input: ConsensusInput): string {
  const recentMsgs = input.recentMessages
    .map(m => `[${m.name}]: ${m.content}`)
    .join('\n')

  const existingItems = [
    ...input.existingConsensus.map(c => `- [共识] ${c.content} (置信度: ${c.confidence})`),
    ...input.existingDivergence.map(d =>
      `- [分歧] ${d.content} (立场: ${d.perspectives.join(' | ')})`
    ),
  ]

  return `讨论话题：${input.topic}

最近发言：
${recentMsgs}

已有共识/分歧：
${existingItems.length > 0 ? existingItems.join('\n') : '(尚无)'}

请分析并返回新发现的共识和分歧。`
}

function extractJson(response: string): string {
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new LLMParseError('共识提炼返回中未找到 JSON 结构')
  }
  return jsonMatch[0]
}

function parseResponse(response: string): {
  consensus: { content: string; confidence: number }[]
  divergence: { content: string; perspectives: string[] }[]
} {
  let data: unknown
  try {
    data = JSON.parse(extractJson(response))
  } catch {
    throw new LLMParseError('共识提炼返回的 JSON 解析失败')
  }

  const result = ConsensusResponseSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new LLMParseError(`共识提炼返回格式不符合预期: ${issues}`)
  }

  return result.data
}

export async function extractConsensus(
  input: ConsensusInput,
  llm: LLMClient
): Promise<{
  consensus: { content: string; confidence: number }[]
  divergence: { content: string; perspectives: string[] }[]
}> {
  if (input.recentMessages.length === 0) {
    return { consensus: [], divergence: [] }
  }

  console.log('[consensus] 开始提炼共识/分歧, topic:', input.topic, 'msg_count:', input.recentMessages.length)

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(input) },
  ]

  try {
    const response = await llm.chat(messages)
    const result = parseResponse(response)
    console.log('[consensus] 提炼完成, consensus:', result.consensus.length, 'divergence:', result.divergence.length)
    return result
  } catch (e) {
    if (e instanceof LLMParseError) {
      console.log('[consensus] 解析失败，降级返回空:', e.message)
      return { consensus: [], divergence: [] }
    }
    throw e
  }
}
