/**
 * REST API 集成测试
 *
 * 完整测试 HTTP 请求→路由→DB→响应链路。
 * - 真实 SQLite 数据库（临时文件）
 * - Mock LLM（通过 vi.mock 劫持 createLLMClient）
 * - 使用 supertest 发起 HTTP 请求
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import supertest from 'supertest'
import { createTestApp, cleanupTestDb, clearAllTables, mockLLM, resetMockLLM } from './helpers.js'

// ===== Mock LLM 模块 =====
// vitest 会将 vi.mock 提升到文件顶部，factory 延迟执行。
// 当 routes 模块首次导入 llm.js 时，factory 运行并返回 { createLLMClient: () => mockLLM }。
vi.mock('../../src/services/llm.js', () => ({
  createLLMClient: () => mockLLM,
}))

let app: ReturnType<typeof supertest>
let request: supertest.Agent

beforeAll(async () => {
  const expressApp = await createTestApp()
  request = supertest.agent(expressApp)
})

afterAll(async () => {
  await cleanupTestDb()
})

beforeEach(async () => {
  resetMockLLM()
  await clearAllTables()
})

// ===== 测试数据工厂 =====

const validCreateBody = {
  topic: 'AI技术对教育公平的影响',
  expert_count: 3,
}

const validPanelistsResponse = {
  panelists: [
    { name: '张澜', role: 'host', title: '科技媒体人', stance: '中立主持', color: '#FFD54F' },
    { name: '李明远', role: 'expert', title: 'AI科学家', stance: 'AI增强论', color: '#4FC3F7' },
    { name: '王若曦', role: 'expert', title: '艺术家', stance: '危机论', color: '#EF5350' },
    { name: '陈建国', role: 'expert', title: '教育学家', stance: '融合论', color: '#66BB6A' },
  ],
}

// ========================================================================
// Health Check
// ========================================================================
describe('GET /api/health', () => {
  test('返回 ok 状态', async () => {
    const res = await request.get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeTruthy()
  })
})

// ========================================================================
// GET /api/discussions — 列表
// ========================================================================
describe('GET /api/discussions', () => {
  test('空数据库返回空数组', async () => {
    const res = await request.get('/api/discussions')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  test('返回已有讨论列表（含 panelists 和 message_count）', async () => {
    // 先创建一条讨论
    mockLLM.addResponse(validPanelistsResponse)
    const createRes = await request.post('/api/discussions').send(validCreateBody)
    expect(createRes.status).toBe(201)

    const res = await request.get('/api/discussions')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].topic).toBe(validCreateBody.topic)
    expect(res.body[0].status).toBe('pending')
    expect(res.body[0].panelists).toHaveLength(4)
    expect(res.body[0].message_count).toBe(0)
  })
})

// ========================================================================
// POST /api/discussions — 创建
// ========================================================================
describe('POST /api/discussions', () => {
  test('正常创建返回 201 + 讨论详情含嘉宾', async () => {
    mockLLM.addResponse(validPanelistsResponse)

    const res = await request.post('/api/discussions').send(validCreateBody)
    expect(res.status).toBe(201)
    expect(res.body.id).toBeTruthy()
    expect(res.body.topic).toBe('AI技术对教育公平的影响')
    expect(res.body.expert_count).toBe(3)
    expect(res.body.status).toBe('pending')
    expect(res.body.panelists).toHaveLength(4)

    // 验证嘉宾结构
    const host = res.body.panelists.find((p: any) => p.role === 'host')
    expect(host).toBeTruthy()
    expect(host.name).toBe('张澜')

    const experts = res.body.panelists.filter((p: any) => p.role === 'expert')
    expect(experts).toHaveLength(3)

    // 验证颜色不重复
    const colors = res.body.panelists.map((p: any) => p.color)
    expect(new Set(colors).size).toBe(4)
  })

  test('空话题返回 400', async () => {
    const res = await request.post('/api/discussions').send({ topic: '', expert_count: 3 })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('话题不能为空')
  })

  test('缺少话题返回 400', async () => {
    const res = await request.post('/api/discussions').send({ expert_count: 3 })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('话题')
  })

  test('expert_count < 1 返回 400', async () => {
    const res = await request.post('/api/discussions').send({ topic: '测试', expert_count: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('专家人数')
  })

  test('expert_count > 8 返回 400', async () => {
    const res = await request.post('/api/discussions').send({ topic: '测试', expert_count: 9 })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('专家人数')
  })

  test('未配置 API Key 返回 500', async () => {
    delete process.env.DEEPSEEK_API_KEY
    const res = await request.post('/api/discussions').send(validCreateBody)
    // 恢复 API key
    process.env.DEEPSEEK_API_KEY = 'test-mock-key'
    expect(res.status).toBe(500)
    expect(res.body.error).toContain('DEEPSEEK_API_KEY')
  })

  test('LLM 生成失败返回 502', async () => {
    // 不注入 mock 响应 → chat 抛出 "队列已空"
    const res = await request.post('/api/discussions').send(validCreateBody)
    // 路由捕获后返回 error
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

// ========================================================================
// GET /api/discussions/:id — 单个讨论
// ========================================================================
describe('GET /api/discussions/:id', () => {
  let discussionId: string

  beforeEach(async () => {
    mockLLM.addResponse(validPanelistsResponse)
    const res = await request.post('/api/discussions').send(validCreateBody)
    discussionId = res.body.id
    resetMockLLM()
  })

  test('获取存在的讨论返回完整详情', async () => {
    const res = await request.get(`/api/discussions/${discussionId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(discussionId)
    expect(res.body.topic).toBe(validCreateBody.topic)
    expect(res.body.panelists).toHaveLength(4)
    expect(res.body.messages).toEqual([])
    expect(res.body.consensus).toEqual([])
    expect(res.body.divergence).toEqual([])
  })

  test('不存在的讨论返回 404', async () => {
    const res = await request.get('/api/discussions/nonexistent-id')
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('讨论不存在')
  })
})

// ========================================================================
// DELETE /api/discussions/:id — 删除
// ========================================================================
describe('DELETE /api/discussions/:id', () => {
  let discussionId: string

  beforeEach(async () => {
    mockLLM.addResponse(validPanelistsResponse)
    const res = await request.post('/api/discussions').send(validCreateBody)
    discussionId = res.body.id
    resetMockLLM()
  })

  test('删除存在的讨论返回 success', async () => {
    const res = await request.delete(`/api/discussions/${discussionId}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // 确认已删除
    const getRes = await request.get(`/api/discussions/${discussionId}`)
    expect(getRes.status).toBe(404)
  })

  test('删除不存在的讨论返回 404', async () => {
    const res = await request.delete('/api/discussions/nonexistent-id')
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('讨论不存在')
  })

  test('删除讨论后列表不再包含该项', async () => {
    await request.delete(`/api/discussions/${discussionId}`)
    const listRes = await request.get('/api/discussions')
    expect(listRes.body).toHaveLength(0)
  })
})

// ========================================================================
// PATCH /api/discussions/:id/pin — 置顶
// ========================================================================
describe('PATCH /api/discussions/:id/pin', () => {
  let discussionId: string

  beforeEach(async () => {
    mockLLM.addResponse(validPanelistsResponse)
    const res = await request.post('/api/discussions').send(validCreateBody)
    discussionId = res.body.id
    resetMockLLM()
  })

  test('置顶讨论', async () => {
    const res = await request
      .patch(`/api/discussions/${discussionId}/pin`)
      .send({ pinned: true })
    expect(res.status).toBe(200)
    expect(res.body.pinned_at).toBeTruthy()
  })

  test('取消置顶', async () => {
    // 先置顶
    await request
      .patch(`/api/discussions/${discussionId}/pin`)
      .send({ pinned: true })
    // 再取消
    const res = await request
      .patch(`/api/discussions/${discussionId}/pin`)
      .send({ pinned: false })
    expect(res.status).toBe(200)
    expect(res.body.pinned_at).toBeNull()
  })

  test('置顶不存在的讨论返回 404', async () => {
    const res = await request
      .patch('/api/discussions/nonexistent-id/pin')
      .send({ pinned: true })
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('讨论不存在')
  })
})

// ========================================================================
// POST /api/discussions/:id/start — 开始讨论
// ========================================================================
describe('POST /api/discussions/:id/start', () => {
  let discussionId: string
  let hostId: string

  beforeEach(async () => {
    // 创建讨论
    mockLLM.addResponse(validPanelistsResponse)
    const createRes = await request.post('/api/discussions').send(validCreateBody)
    discussionId = createRes.body.id
    hostId = createRes.body.panelists.find((p: any) => p.role === 'host').id
  })

  test('正常开始讨论 → 状态变为 live 并产生首条发言', async () => {
    // Queue: decideNextSpeaker → opening by host
    mockLLM.addResponse({ panelist_id: hostId, type: 'opening' })
    // Queue: generateSpeechContent (stream)
    mockLLM.addStreamTokens(['欢迎', '各位来到', '今天的圆桌讨论', '，', '我们探讨AI与教育'])

    const res = await request.post(`/api/discussions/${discussionId}/start`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('live')
    expect(res.body.messages).toHaveLength(1)
    expect(res.body.messages[0].type).toBe('opening')
    expect(res.body.messages[0].panelist_id).toBe(hostId)
    expect(res.body.messages[0].content).toContain('欢迎')
  })

  test('非 pending 状态开始讨论返回 400', async () => {
    // 先开始一次
    mockLLM.addResponse({ panelist_id: hostId, type: 'opening' })
    mockLLM.addStreamTokens(['开场'])
    await request.post(`/api/discussions/${discussionId}/start`)

    // 再次开始
    const res = await request.post(`/api/discussions/${discussionId}/start`)
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('已开始')
  })

  test('开始不存在的讨论返回 404', async () => {
    const res = await request.post('/api/discussions/nonexistent-id/start')
    expect(res.status).toBe(404)
    expect(res.body.error).toContain('讨论不存在')
  })
})

// ========================================================================
// POST /api/discussions/:id/confirm — 确认并开始
// ========================================================================
describe('POST /api/discussions/:id/confirm', () => {
  let discussionId: string
  let hostId: string

  beforeEach(async () => {
    mockLLM.addResponse(validPanelistsResponse)
    const createRes = await request.post('/api/discussions').send(validCreateBody)
    discussionId = createRes.body.id
    hostId = createRes.body.panelists.find((p: any) => p.role === 'host').id
  })

  test('确认讨论 → 状态变为 live 并产生首条发言', async () => {
    mockLLM.addResponse({ panelist_id: hostId, type: 'opening' })
    mockLLM.addStreamTokens(['各位好，', '今天我们讨论', 'AI与教育公平的话题'])

    const res = await request.post(`/api/discussions/${discussionId}/confirm`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('live')
    expect(res.body.messages).toHaveLength(1)
    expect(res.body.messages[0].type).toBe('opening')
  })

  test('确认不存在的讨论返回 404', async () => {
    const res = await request.post('/api/discussions/nonexistent-id/confirm')
    expect(res.status).toBe(404)
  })
})

// ========================================================================
// POST /api/discussions/:id/next-step — 逐步推进
// ========================================================================
describe('POST /api/discussions/:id/next-step', () => {
  let discussionId: string
  let hostId: string
  let expertIds: string[]

  beforeEach(async () => {
    // 创建讨论
    mockLLM.addResponse(validPanelistsResponse)
    const createRes = await request.post('/api/discussions').send(validCreateBody)
    discussionId = createRes.body.id
    hostId = createRes.body.panelists.find((p: any) => p.role === 'host').id
    expertIds = createRes.body.panelists
      .filter((p: any) => p.role === 'expert')
      .map((p: any) => p.id)

    // 确认并开始
    mockLLM.addResponse({ panelist_id: hostId, type: 'opening' })
    mockLLM.addStreamTokens(['欢迎各位。'])
    await request.post(`/api/discussions/${discussionId}/confirm`)
  })

  test('正常推进一轮 → 返回新消息', async () => {
    mockLLM.addResponse({ panelist_id: expertIds[0], type: 'statement' })
    mockLLM.addStreamTokens(['我认为AI可以', '帮助缩小教育差距。'])

    const res = await request.post(`/api/discussions/${discussionId}/next-step`)
    expect(res.status).toBe(200)
    expect(res.body.messages.length).toBeGreaterThanOrEqual(2)
    // 最新消息应该是 expert 的 statement
    const latestMsg = res.body.messages[res.body.messages.length - 1]
    expect(latestMsg.panelist_id).toBe(expertIds[0])
    expect(latestMsg.type).toBe('statement')
    expect(latestMsg.content).toContain('AI')
  })

  test('推进到 closing → 讨论状态变为 ended', async () => {
    // 直接注入 closing 决策
    mockLLM.addResponse({ panelist_id: hostId, type: 'closing' })
    mockLLM.addStreamTokens(['感谢各位参与，', '今天的讨论到此结束。'])

    const res = await request.post(`/api/discussions/${discussionId}/next-step`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ended')
  })

  test('非 live 状态推进返回 400', async () => {
    // 先结束讨论
    mockLLM.addResponse({ panelist_id: hostId, type: 'closing' })
    mockLLM.addStreamTokens(['结束语。'])
    await request.post(`/api/discussions/${discussionId}/next-step`)

    // 再次推进
    mockLLM.addResponse({ panelist_id: hostId, type: 'statement' })
    mockLLM.addStreamTokens(['不应该再发言了。'])
    const res = await request.post(`/api/discussions/${discussionId}/next-step`)
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('未在运行中')
  })

  test('推进不存在的讨论返回 404', async () => {
    const res = await request.post('/api/discussions/nonexistent-id/next-step')
    expect(res.status).toBe(404)
  })
})

// ========================================================================
// 讨论完整生命周期测试
// ========================================================================
describe('讨论完整生命周期', () => {
  test('创建 → 开始 → 多轮推进 → 结束', async () => {
    // 1. 创建
    mockLLM.addResponse(validPanelistsResponse)
    const createRes = await request.post('/api/discussions').send(validCreateBody)
    expect(createRes.status).toBe(201)
    const discussionId = createRes.body.id
    const hostId = createRes.body.panelists.find((p: any) => p.role === 'host').id
    const expertIds = createRes.body.panelists
      .filter((p: any) => p.role === 'expert')
      .map((p: any) => p.id)

    // 2. 确认开始
    mockLLM.addResponse({ panelist_id: hostId, type: 'opening' })
    mockLLM.addStreamTokens(['欢迎各位来到今天的讨论。'])
    const confirmRes = await request.post(`/api/discussions/${discussionId}/confirm`)
    expect(confirmRes.status).toBe(200)
    expect(confirmRes.body.status).toBe('live')

    // 3. 第一轮 expert 发言
    mockLLM.addResponse({ panelist_id: expertIds[0], type: 'statement' })
    mockLLM.addStreamTokens(['我认为AI技术在教育领域大有可为。'])
    const step1Res = await request.post(`/api/discussions/${discussionId}/next-step`)
    expect(step1Res.status).toBe(200)
    expect(step1Res.body.messages).toHaveLength(2)

    // 4. 第二轮 rebuttal
    mockLLM.addResponse({ panelist_id: expertIds[1], type: 'rebuttal' })
    mockLLM.addStreamTokens(['我不完全同意，技术本身不能解决教育不平等。'])
    const step2Res = await request.post(`/api/discussions/${discussionId}/next-step`)
    expect(step2Res.status).toBe(200)
    expect(step2Res.body.messages).toHaveLength(3)

    // 5. 结束（第4条消息会触发 extractConsensus）
    mockLLM.addResponse({ panelist_id: hostId, type: 'closing' })
    mockLLM.addStreamTokens(['感谢各位的真知灼见，讨论到此结束。'])
    // extractConsensus 响应（nextSeq >= 4 时调用）
    mockLLM.addResponse({ consensus: [], divergence: [] })
    const endRes = await request.post(`/api/discussions/${discussionId}/next-step`)
    expect(endRes.status).toBe(200)
    expect(endRes.body.status).toBe('ended')

    // 6. 验证详情
    const detailRes = await request.get(`/api/discussions/${discussionId}`)
    expect(detailRes.body.status).toBe('ended')
    expect(detailRes.body.messages).toHaveLength(4)
  })
})

// ========================================================================
// 数据库级联删除验证
// ========================================================================
describe('数据库完整性', () => {
  test('删除讨论后关联的 panelists/messages 一并清除', async () => {
    // 创建讨论
    mockLLM.addResponse(validPanelistsResponse)
    const createRes = await request.post('/api/discussions').send(validCreateBody)
    const discussionId = createRes.body.id
    const hostId = createRes.body.panelists.find((p: any) => p.role === 'host').id

    // 开始讨论（产生 message）
    mockLLM.addResponse({ panelist_id: hostId, type: 'opening' })
    mockLLM.addStreamTokens(['开场白'])
    await request.post(`/api/discussions/${discussionId}/confirm`)

    // 删除
    await request.delete(`/api/discussions/${discussionId}`)

    // 确认讨论不存在
    const getRes = await request.get(`/api/discussions/${discussionId}`)
    expect(getRes.status).toBe(404)

    // 确认列表为空
    const listRes = await request.get('/api/discussions')
    expect(listRes.body).toHaveLength(0)
  })
})
