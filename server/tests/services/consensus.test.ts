import { describe, test, expect } from 'vitest'
import { extractConsensus } from '../../src/services/consensus.js'
import { MockLLMClient } from '../setup.js'

const sampleInput = {
  topic: 'AI与教育',
  recentMessages: [
    { panelist_id: 'p-1', name: '张教授', content: 'AI可以个性化辅导每个学生' },
    { panelist_id: 'p-2', name: '李老师', content: '但农村学校连网络都没有，何谈AI' },
    { panelist_id: 'p-3', name: '王博士', content: '我同意AI有潜力，但前提是解决接入问题' },
  ],
  existingConsensus: [
    { id: 'c-1', content: 'AI对教育有积极影响', confidence: 0.7 },
  ],
  existingDivergence: [
    { id: 'd-1', content: 'AI教育工具的普及速度', perspectives: ['乐观', '悲观'] },
  ],
}

const validConsensusResponse = {
  consensus: [
    { content: 'AI教育的推进需要先解决基础设施问题', confidence: 0.85 },
  ],
  divergence: [
    { content: 'AI取代教师 vs AI辅助教师', perspectives: ['AI将取代大部分教学工作', 'AI只能是辅助工具无法替代教师'] },
  ],
}

describe('extractConsensus - 正常流程', () => {
  test('从发言中提取共识和分歧', async () => {
    const mock = new MockLLMClient()
    mock.addResponse(validConsensusResponse)
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(1)
    expect(result.consensus[0].content).toBe(validConsensusResponse.consensus[0].content)
    expect(result.consensus[0].confidence).toBe(0.85)
    expect(result.divergence).toHaveLength(1)
  })

  test('无新发现时返回空数组', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ consensus: [], divergence: [] })
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })
})

describe('extractConsensus - 边界条件', () => {
  test('空发言列表 → 跳过提炼返回空数组', async () => {
    const mock = new MockLLMClient()
    const result = await extractConsensus(
      { ...sampleInput, recentMessages: [] },
      mock
    )
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })

  test('confidence 超出 0-1 范围 → Zod 校验失败 → 降级返回空', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      consensus: [{ content: '测试', confidence: 1.5 }],
      divergence: [],
    })
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })

  test('divergence 中 perspectives 少于 2 个 → 降级', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      consensus: [],
      divergence: [{ content: '某个分歧', perspectives: ['单一立场'] }],
    })
    const result = await extractConsensus(sampleInput, mock)
    expect(result.divergence).toHaveLength(0)
  })

  test('LLM 返回非法 JSON → 降级返回空数组', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('这不是 JSON')
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })

  test('LLM 返回缺少 consensus 字段 → 降级', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ something: 'else' })
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })
})
