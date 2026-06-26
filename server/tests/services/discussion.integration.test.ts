/**
 * discussion 服务集成测试
 *
 * 调用真实 DeepSeek API 验证发言调度服务。
 * 仅验证结构合法，不验证具体内容。
 * 无有效 DEEPSEEK_API_KEY 时自动跳过。
 */

import { describe, test, expect } from 'vitest'
import { decideNextSpeaker } from '../../src/services/discussion.js'
import { createLLMClient } from '../../src/services/llm.js'

const apiKey = process.env.DEEPSEEK_API_KEY
const runIntegration = !!(apiKey && apiKey !== 'sk-your-key-here')
const describeIf = runIntegration ? describe : describe.skip

const sampleCtx = {
  topic: '远程办公的利弊',
  panelists: [
    { id: 'p-host', name: '陈思远', role: 'host' as const, title: '企业管理顾问', stance: '中立', status: 'standby' as const },
    { id: 'p-exp1', name: '刘佳', role: 'expert' as const, title: '人力资源总监', stance: '支持远程办公', status: 'standby' as const },
    { id: 'p-exp2', name: '王志强', role: 'expert' as const, title: '组织心理学家', stance: '担忧团队凝聚力下降', status: 'standby' as const },
    { id: 'p-exp3', name: '李雪', role: 'expert' as const, title: 'IT基础设施专家', stance: '强调技术可行性', status: 'standby' as const },
  ],
  messages: [
    { panelist_id: 'p-host', name: '陈思远', content: '今天我们来讨论远程办公的利弊，各位专家请自由发表观点。', type: 'opening' as const },
    { panelist_id: 'p-exp1', name: '刘佳', content: '远程办公显著提高了员工满意度和工作效率，我们的调查数据显示生产率提升了15%。', type: 'statement' as const },
  ],
}

describeIf('decideNextSpeaker - 集成测试（真实 API）', () => {
  let llm: ReturnType<typeof createLLMClient> | null = null
  function getLLM() {
    if (!llm) llm = createLLMClient(apiKey!)
    return llm
  }

  test('给定上下文返回合法的发言调度决策', async () => {
    const result = await decideNextSpeaker(sampleCtx, getLLM())

    // panelist_id 必须在嘉宾列表中
    const validIds = sampleCtx.panelists.map(p => p.id)
    expect(validIds).toContain(result.panelist_id)

    // type 必须是合法 MessageType
    expect(['opening', 'statement', 'rebuttal', 'supplement', 'closing']).toContain(result.type)
  }, 30000)

  test('空消息列表时应由主持人开场', async () => {
    const result = await decideNextSpeaker(
      {
        topic: 'AI的伦理边界',
        panelists: sampleCtx.panelists,
        messages: [],
      },
      getLLM()
    )

    expect(result.panelist_id).toBe('p-host')
    expect(result.type).toBe('opening')
  }, 30000)

  test('多轮发言后应合理选择下一位发言人', async () => {
    const ctxWithMoreMessages = {
      ...sampleCtx,
      messages: [
        ...sampleCtx.messages,
        { panelist_id: 'p-exp2', name: '王志强', content: '我担心远程办公会削弱团队创新力，面对面交流不可替代。', type: 'rebuttal' as const },
        { panelist_id: 'p-exp3', name: '李雪', content: '技术层面已经可以很好地支持远程协作，VR会议等新技术正在弥合距离感。', type: 'supplement' as const },
      ],
    }

    const result = await decideNextSpeaker(ctxWithMoreMessages, getLLM())

    const validIds = ctxWithMoreMessages.panelists.map(p => p.id)
    expect(validIds).toContain(result.panelist_id)
    expect(['opening', 'statement', 'rebuttal', 'supplement', 'closing']).toContain(result.type)

    // 连续发言不超过2次的规则应在真实 API 调用中得到尊重
    // 如果前2条最后是同一人，不应再选它
    const lastTwo = ctxWithMoreMessages.messages.slice(-2)
    if (lastTwo.length === 2 && lastTwo[0].panelist_id === lastTwo[1].panelist_id) {
      expect(result.panelist_id).not.toBe(lastTwo[0].panelist_id)
    }
  }, 30000)
})
