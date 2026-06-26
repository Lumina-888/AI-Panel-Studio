/**
 * panelist 服务集成测试
 *
 * 调用真实 DeepSeek API 验证嘉宾生成服务。
 * 仅验证结构合法，不验证具体内容。
 * 无有效 DEEPSEEK_API_KEY 时自动跳过。
 */

import { describe, test, expect } from 'vitest'
import { generatePanelists } from '../../src/services/panelist.js'
import { createLLMClient } from '../../src/services/llm.js'

const apiKey = process.env.DEEPSEEK_API_KEY
const runIntegration = !!(apiKey && apiKey !== 'sk-your-key-here')
const describeIf = runIntegration ? describe : describe.skip

describeIf('generatePanelists - 集成测试（真实 API）', () => {
  // lazy init：仅当 describe 执行时才创建客户端
  let llm: ReturnType<typeof createLLMClient> | null = null
  function getLLM() {
    if (!llm) llm = createLLMClient(apiKey!)
    return llm
  }

  test('给定话题生成合法嘉宾阵容', async () => {
    const result = await generatePanelists(
      { topic: 'AI技术对教育公平的影响', expert_count: 3 },
      getLLM()
    )

    // 结构校验：1 host + 3 expert
    expect(result).toHaveLength(4)
    expect(result.filter(p => p.role === 'host')).toHaveLength(1)
    expect(result.filter(p => p.role === 'expert')).toHaveLength(3)

    // 颜色不重复
    const colors = result.map(p => p.color.toLowerCase())
    expect(new Set(colors).size).toBe(4)

    // 所有必填字段非空
    for (const p of result) {
      expect(p.name).toBeTruthy()
      expect(p.role).toMatch(/^(host|expert)$/)
      expect(p.title).toBeTruthy()
      expect(p.stance).toBeTruthy()
      expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  }, 30000)

  test('不同话题产生不同的嘉宾阵容', async () => {
    const a = await generatePanelists(
      { topic: '自动驾驶伦理与责任归属', expert_count: 2 },
      getLLM()
    )
    const b = await generatePanelists(
      { topic: '远程办公对企业文化的影响', expert_count: 2 },
      getLLM()
    )

    // 至少 names 不完全相同（不同话题应有不同专家）
    const namesA = new Set(a.map(p => p.name))
    const namesB = new Set(b.map(p => p.name))
    const overlap = [...namesA].filter(n => namesB.has(n))
    expect(overlap.length).toBeLessThan(a.length)
  }, 60000)

  test('expert_count=1 生成 1 host + 1 expert', async () => {
    const result = await generatePanelists(
      { topic: '可再生能源的经济可行性', expert_count: 1 },
      getLLM()
    )

    expect(result).toHaveLength(2)
    expect(result.filter(p => p.role === 'host')).toHaveLength(1)
    expect(result.filter(p => p.role === 'expert')).toHaveLength(1)

    const colors = result.map(p => p.color.toLowerCase())
    expect(new Set(colors).size).toBe(2)
  }, 30000)
})
