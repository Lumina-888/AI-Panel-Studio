import type { LLMClient } from '../src/types/index.js'

/**
 * MockLLMClient — 可注入预设响应的测试用 LLM 客户端。
 * 生产代码通过 LLMClient 接口依赖注入，测试无需修改生产代码。
 */
export class MockLLMClient implements LLMClient {
  private responses: { role: string; content: string }[] = []
  private streamTokens: string[][] = []

  /** 压入 JSON 对象（自动 JSON.stringify） */
  addResponse(data: unknown): this {
    this.responses.push({ role: 'assistant', content: JSON.stringify(data) })
    return this
  }

  /** 压入原始文本 */
  addRawResponse(text: string): this {
    this.responses.push({ role: 'assistant', content: text })
    return this
  }

  /** 压入流式 token 数组 */
  addStreamTokens(tokens: string[]): this {
    this.streamTokens.push(tokens)
    return this
  }

  /** 清空所有响应队列 */
  reset(): this {
    this.responses = []
    this.streamTokens = []
    return this
  }

  /** 消费队列中下一条响应 */
  async chat(_messages: { role: string; content: string }[]): Promise<string> {
    const next = this.responses.shift()
    if (!next) {
      throw new Error('MockLLMClient: 响应队列已空，请先调用 addResponse/addRawResponse')
    }
    return next.content
  }

  /** 异步生成器，逐 token yield */
  async *streamChat(_messages: { role: string; content: string }[]): AsyncGenerator<string> {
    const tokens = this.streamTokens.shift()
    if (!tokens) {
      throw new Error('MockLLMClient: 流式 token 队列已空，请先调用 addStreamTokens')
    }
    for (const token of tokens) {
      yield token
    }
  }
}
