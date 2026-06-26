import { describe, test, expect } from 'vitest'
import { decideNextSpeaker } from '../../src/services/discussion.js'
import { MockLLMClient } from '../setup.js'

const sampleCtx = {
  topic: 'AI与教育',
  panelists: [
    { id: 'p-host', name: '张澜', role: 'host' as const, title: '科技媒体人', stance: '中立主持', status: 'standby' as const },
    { id: 'p-exp1', name: '李明远', role: 'expert' as const, title: 'AI科学家', stance: 'AI增强论', status: 'standby' as const },
    { id: 'p-exp2', name: '王若曦', role: 'expert' as const, title: '艺术家', stance: '危机论', status: 'standby' as const },
    { id: 'p-exp3', name: '陈建国', role: 'expert' as const, title: '教育学家', stance: '融合论', status: 'standby' as const },
  ],
  messages: [
    { panelist_id: 'p-host', name: '张澜', content: '欢迎各位', type: 'opening' as const },
    { panelist_id: 'p-exp1', name: '李明远', content: '我认为AI是工具', type: 'statement' as const },
  ],
}

const validDecision = {
  panelist_id: 'p-exp2',
  type: 'rebuttal',
}

describe('decideNextSpeaker - 输入校验', () => {
  test('空嘉宾列表抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      decideNextSpeaker({ topic: '测试', panelists: [], messages: [] }, mock)
    ).rejects.toThrow('嘉宾列表')
  })

  test('LLM 返回不存在的 panelist_id → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'nonexistent', type: 'statement' })
    await expect(
      decideNextSpeaker(sampleCtx, mock)
    ).rejects.toThrow('LLM')
  })
})

describe('decideNextSpeaker - 发言类型校验', () => {
  test('LLM 返回非法 MessageType → 降级为 statement', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-exp1', type: 'yelling' })
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.type).toBe('statement')
  })

  test('正常返回 type=rebuttal → 保持不变', async () => {
    const mock = new MockLLMClient()
    mock.addResponse(validDecision)
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.type).toBe('rebuttal')
  })
})

describe('decideNextSpeaker - 发言序列规则', () => {
  test('同一嘉宾已连续发言 2 次 → 再次选择时抛出错误', async () => {
    const ctx = {
      ...sampleCtx,
      messages: [
        ...sampleCtx.messages,
        { panelist_id: 'p-exp1', name: '李明远', content: '第二次发言', type: 'statement' as const },
        { panelist_id: 'p-exp1', name: '李明远', content: '第三次连续', type: 'supplement' as const },
      ],
    }
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-exp1', type: 'statement' })
    await expect(decideNextSpeaker(ctx, mock)).rejects.toThrow('连续发言')
  })

  test('同一嘉宾只发言 1 次 → 可以再次被选中', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-exp1', type: 'statement' })
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.panelist_id).toBe('p-exp1')
  })
})

describe('decideNextSpeaker - 开场与结束', () => {
  test('无历史发言时 LLM 应返回 opening 类型', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-host', type: 'opening' })
    const result = await decideNextSpeaker(
      { topic: 'AI与教育', panelists: sampleCtx.panelists, messages: [] },
      mock
    )
    expect(result.type).toBe('opening')
    expect(result.panelist_id).toBe('p-host')
  })

  test('LLM 返回 closing → 讨论结束', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-host', type: 'closing' })
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.type).toBe('closing')
  })
})

describe('decideNextSpeaker - LLM 解析容错', () => {
  test('LLM 返回 markdown 包裹的 JSON → 正确解析', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('```json\n' + JSON.stringify(validDecision) + '\n```')
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.panelist_id).toBe('p-exp2')
  })

  test('LLM 返回非法 JSON → 抛出 LLM_PARSE_ERROR', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('invalid response without json')
    await expect(decideNextSpeaker(sampleCtx, mock)).rejects.toThrow('LLM')
  })
})
