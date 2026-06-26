import { describe, test, expect } from 'vitest'
import { generatePanelists } from '../../src/services/panelist.js'
import { MockLLMClient } from '../setup.js'

const validResponse = {
  panelists: [
    { name: '张澜', role: 'host', title: '科技媒体人', stance: '中立主持', color: '#FFD54F' },
    { name: '李明远', role: 'expert', title: 'AI科学家', stance: 'AI增强论', color: '#4FC3F7' },
    { name: '王若曦', role: 'expert', title: '艺术家', stance: '危机论', color: '#EF5350' },
    { name: '陈建国', role: 'expert', title: '教育学家', stance: '融合论', color: '#66BB6A' },
  ],
}

describe('generatePanelists - 输入校验', () => {
  test('空话题抛出 VALIDATION_ERROR', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: '', expert_count: 3 }, mock)
    ).rejects.toThrow('话题不能为空')
  })

  test('expert_count 为 0 抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: 0 }, mock)
    ).rejects.toThrow('专家人数')
  })

  test('expert_count 为负数抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: -1 }, mock)
    ).rejects.toThrow('专家人数')
  })

  test('expert_count > 8 抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: 9 }, mock)
    ).rejects.toThrow('专家人数')
  })
})

describe('generatePanelists - 响应解析', () => {
  test('正常 JSON 返回解析为正确的嘉宾数组', async () => {
    const mock = new MockLLMClient()
    mock.addResponse(validResponse)
    const result = await generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual(validResponse.panelists[0])
  })

  test('LLM 返回时用 markdown 代码块包裹 JSON → 正确解析', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('```json\n' + JSON.stringify(validResponse) + '\n```')
    const result = await generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    expect(result).toHaveLength(4)
  })

  test('LLM 返回非法 JSON → 重试后仍失败则抛出 LLM_PARSE_ERROR', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('这不是合法的 JSON {{{')
    mock.addRawResponse('仍然不是 JSON ###')
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    ).rejects.toThrow('LLM')
  })

  test('返回缺少必填字段 name → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [{ role: 'host', title: 'x', stance: 'x', color: '#000000' }],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('LLM')
  })

  test('返回非法 role 值 → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [{ name: 'A', role: 'moderator', title: 'x', stance: 'x', color: '#000000' }],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('LLM')
  })

  test('返回非法 color 格式 → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [{ name: 'A', role: 'host', title: 'x', stance: 'x', color: 'red' }],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('LLM')
  })
})

describe('generatePanelists - 业务约束', () => {
  test('必须恰好有 1 个 host', async () => {
    const mock = new MockLLMClient()
    // 业务校验失败会触发 LLM 重试，因此需要 2 个响应（都缺少 host）
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'expert', title: 'x', stance: 'x', color: '#111111' },
        { name: 'B', role: 'expert', title: 'x', stance: 'x', color: '#222222' },
      ],
    })
    mock.addResponse({
      panelists: [
        { name: 'C', role: 'expert', title: 'x', stance: 'x', color: '#333333' },
        { name: 'D', role: 'expert', title: 'x', stance: 'x', color: '#444444' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('主持人')
  })

  test('host 多于 1 个 → 抛出错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'host', title: 'x', stance: 'x', color: '#111111' },
        { name: 'B', role: 'host', title: 'x', stance: 'x', color: '#222222' },
      ],
    })
    mock.addResponse({
      panelists: [
        { name: 'C', role: 'host', title: 'x', stance: 'x', color: '#333333' },
        { name: 'D', role: 'host', title: 'x', stance: 'x', color: '#444444' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('主持人')
  })

  test('专家人数与请求不一致 → 抛出错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'host', title: 'x', stance: 'x', color: '#111111' },
        { name: 'B', role: 'expert', title: 'x', stance: 'x', color: '#222222' },
      ],
    })
    mock.addResponse({
      panelists: [
        { name: 'C', role: 'host', title: 'x', stance: 'x', color: '#333333' },
        { name: 'D', role: 'expert', title: 'x', stance: 'x', color: '#444444' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 3 }, mock)
    ).rejects.toThrow('专家人数')
  })

  test('所有嘉宾颜色不重复', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'host', title: 'x', stance: 'x', color: '#FFD54F' },
        { name: 'B', role: 'expert', title: 'x', stance: 'x', color: '#FFD54F' },
        { name: 'C', role: 'expert', title: 'x', stance: 'x', color: '#FFD54F' },
      ],
    })
    mock.addResponse({
      panelists: [
        { name: 'D', role: 'host', title: 'x', stance: 'x', color: '#AA0000' },
        { name: 'E', role: 'expert', title: 'x', stance: 'x', color: '#AA0000' },
        { name: 'F', role: 'expert', title: 'x', stance: 'x', color: '#AA0000' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 2 }, mock)
    ).rejects.toThrow('颜色')
  })
})

describe('generatePanelists - 重试逻辑', () => {
  test('首次解析失败后重试成功 → 返回正确结果', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('非法的 JSON {{{')
    mock.addResponse(validResponse)
    const result = await generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    expect(result).toHaveLength(4)
  })
})
