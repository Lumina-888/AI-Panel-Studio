import { z } from 'zod'
import type { LLMClient, GeneratePanelistsInput, GeneratedPanelist } from '../types/index.js'
import { ValidationError, LLMParseError } from '../utils/errors.js'
import { extractJson } from '../utils/json.js'

const PanelistSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['host', 'expert']),
  title: z.string().min(1),
  stance: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

const ResponseSchema = z.object({
  panelists: z.array(PanelistSchema),
})

function buildSystemPrompt(): string {
  return `你是一个圆桌讨论嘉宾生成器。根据用户提供的讨论话题和专家人数，生成一组 AI 圆桌讨论嘉宾阵容。

规则：
1. 生成 1 位主持人(role: "host") + N 位专家(role: "expert")，N 等于用户指定的专家人数
2. 每位嘉宾必须包含：
   - name: 中文姓名
   - role: "host" 或 "expert"
   - title: 职业头衔（如"AI研究员"、"社会学家"等）
   - stance: 对该话题的立场描述（一句话概括观点倾向）
   - color: 十六进制颜色代码（如 #FF5733），用于 UI 标识
3. 颜色必须各不相同，选用高辨识度的 Material Design 色板颜色
4. 各专家的立场应具有多样性和张力，覆盖不同视角
5. 主持人的立场应偏中立，主要负责引导讨论

严格以 JSON 格式返回：
{"panelists": [{"name": "...", "role": "host", "title": "...", "stance": "...", "color": "#XXXXXX"}]}`
}

function buildUserPrompt(topic: string, expertCount: number): string {
  return `讨论话题：${topic}\n指定专家人数：${expertCount}`
}

function parseResponse(response: string): GeneratedPanelist[] {
  let data: unknown
  try {
    const jsonStr = extractJson(response, '嘉宾生成')
    data = JSON.parse(jsonStr)
  } catch {
    throw new LLMParseError('LLM 返回内容无法解析为 JSON')
  }

  const result = ResponseSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new LLMParseError(`LLM 返回格式不符合预期: ${issues}`)
  }

  return result.data.panelists
}

function validatePanelists(panelists: GeneratedPanelist[], expectedExpertCount: number): void {
  const hosts = panelists.filter(p => p.role === 'host')
  if (hosts.length !== 1) {
    throw new LLMParseError(`主持人数量应为 1，实际为 ${hosts.length}`)
  }

  const experts = panelists.filter(p => p.role === 'expert')
  if (experts.length !== expectedExpertCount) {
    throw new LLMParseError(`专家人数应为 ${expectedExpertCount}，实际为 ${experts.length}`)
  }

  const colors = panelists.map(p => p.color.toLowerCase())
  if (new Set(colors).size !== colors.length) {
    throw new LLMParseError('嘉宾颜色存在重复')
  }
}

export async function generatePanelists(
  input: GeneratePanelistsInput,
  llm: LLMClient
): Promise<GeneratedPanelist[]> {
  if (!input.topic.trim()) {
    throw new ValidationError('话题不能为空')
  }
  if (input.expert_count < 1 || input.expert_count > 8) {
    throw new ValidationError('专家人数必须在 1-8 之间')
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(input.topic, input.expert_count) },
  ]

  console.log('[panelist] 开始生成嘉宾阵容, topic:', input.topic, 'expert_count:', input.expert_count)
  let response = await llm.chat(messages)

  try {
    const panelists = parseResponse(response)
    validatePanelists(panelists, input.expert_count)
    console.log('[panelist] 嘉宾生成成功, 总数:', panelists.length)
    return panelists
  } catch (e) {
    if (e instanceof LLMParseError) {
      console.log('[panelist] 首次解析失败，重试中...', e.message)
      response = await llm.chat(messages)
      const panelists = parseResponse(response)
      validatePanelists(panelists, input.expert_count)
      console.log('[panelist] 重试成功, 总数:', panelists.length)
      return panelists
    }
    throw e
  }
}
