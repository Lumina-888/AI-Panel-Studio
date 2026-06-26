/**
 * consensus 服务集成测试
 *
 * 调用真实 DeepSeek API 验证共识/分歧提炼服务。
 * 仅验证结构合法，不验证具体内容。
 * 无有效 DEEPSEEK_API_KEY 时自动跳过。
 */

import { describe, test, expect } from 'vitest'
import { extractConsensus } from '../../src/services/consensus.js'
import { createLLMClient } from '../../src/services/llm.js'

const apiKey = process.env.DEEPSEEK_API_KEY
const runIntegration = !!(apiKey && apiKey !== 'sk-your-key-here')
const describeIf = runIntegration ? describe : describe.skip

const sampleInput = {
  topic: '碳中和的经济影响',
  recentMessages: [
    { panelist_id: 'p-1', name: 'Andrew Chen', content: '碳交易机制是成本最低的减碳方式，已被欧盟证实有效，应该全球推广。' },
    { panelist_id: 'p-2', name: '萨拉', content: '发展中国家不能承担与发达国家相同的减排成本，这本质上是不公平的。' },
    { panelist_id: 'p-3', name: '高桥', content: '太阳能成本过去十年下降了90%，技术突破会解决成本问题，我们不应过度悲观。' },
    { panelist_id: 'p-1', name: 'Andrew Chen', content: '我同意技术是关键驱动力，但碳定价机制能加速技术采用，两者并不矛盾。' },
  ],
  existingConsensus: [],
  existingDivergence: [],
}

describeIf('extractConsensus - 集成测试（真实 API）', () => {
  let llm: ReturnType<typeof createLLMClient> | null = null
  function getLLM() {
    if (!llm) llm = createLLMClient(apiKey!)
    return llm
  }

  test('从多轮发言中提取合法结构的共识和分歧', async () => {
    const result = await extractConsensus(sampleInput, getLLM())

    // 验证顶层结构
    expect(Array.isArray(result.consensus)).toBe(true)
    expect(Array.isArray(result.divergence)).toBe(true)

    // 验证共识项结构
    for (const c of result.consensus) {
      expect(c.content).toBeTruthy()
      expect(typeof c.confidence).toBe('number')
      expect(c.confidence).toBeGreaterThanOrEqual(0)
      expect(c.confidence).toBeLessThanOrEqual(1)
    }

    // 验证分歧项结构
    for (const d of result.divergence) {
      expect(d.content).toBeTruthy()
      expect(Array.isArray(d.perspectives)).toBe(true)
      expect(d.perspectives.length).toBeGreaterThanOrEqual(2)
      for (const p of d.perspectives) {
        expect(p).toBeTruthy()
      }
    }

    // 至少应有一些分析产出
    const hasOutput = result.consensus.length > 0 || result.divergence.length > 0
    expect(hasOutput).toBe(true)
  }, 30000)

  test('空发言列表应跳过提炼返回空数组', async () => {
    const result = await extractConsensus(
      { ...sampleInput, recentMessages: [] },
      getLLM()
    )

    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })

  test('已有共识时不应重复产出相同共识', async () => {
    const result = await extractConsensus(
      {
        ...sampleInput,
        existingConsensus: [
          { id: 'c-1', content: '碳交易机制是有效的减排工具', confidence: 0.8 },
        ],
        existingDivergence: [
          { id: 'd-1', content: '发达国家与发展中国家的减排责任分配', perspectives: ['共同但有区别的责任', '统一的全球碳价'] },
        ],
      },
      getLLM()
    )

    expect(Array.isArray(result.consensus)).toBe(true)
    expect(Array.isArray(result.divergence)).toBe(true)

    // 结构校验
    for (const c of result.consensus) {
      expect(c.confidence).toBeGreaterThanOrEqual(0)
      expect(c.confidence).toBeLessThanOrEqual(1)
    }
    for (const d of result.divergence) {
      expect(d.perspectives.length).toBeGreaterThanOrEqual(2)
    }
  }, 30000)
})
