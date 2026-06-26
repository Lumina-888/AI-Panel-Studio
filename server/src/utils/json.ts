import { LLMParseError } from './errors.js'

/**
 * 从 LLM 返回中提取 JSON 字符串。
 * 支持三种格式（按优先级）：
 * 1. Markdown code block（```json ... ``` 或 ``` ... ```）
 * 2. 花括号对提取（第一个 { 到最后一个 }）
 * 3. 纯 JSON 字符串（直接返回 trimmed）
 *
 * @param response  LLM 返回的原始文本
 * @param context  错误消息中的上下文标识（如 '发言调度'、'共识提炼'）
 * @returns 提取出的 JSON 字符串
 * @throws  LLMParseError 如果未找到可解析的 JSON 结构
 */
export function extractJson(response: string, context: string = 'LLM'): string {
  // 1. 尝试 code block
  const codeBlock = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) return codeBlock[1].trim()

  // 2. 尝试花括号对
  const firstBrace = response.indexOf('{')
  const lastBrace = response.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return response.slice(firstBrace, lastBrace + 1)
  }

  // 3. 回退：直接返回 trimmed（调用方自行处理）
  const trimmed = response.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed
  }

  throw new LLMParseError(`${context}返回中未找到 JSON 结构`)
}
