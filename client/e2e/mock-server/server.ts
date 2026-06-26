/**
 * E2E Mock API Server
 *
 * 模拟完整的 AI Panel Studio 后端 API（REST + SSE）。
 * 使用 Node.js 原生 http 模块，零外部依赖。
 * 端口：3001（Vite dev server 自动代理 /api 到此端口）
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { randomUUID } from 'crypto'

// ---- 模拟数据 ----

interface Panelist {
  id: string
  discussion_id: string
  name: string
  role: string
  title: string
  stance: string
  color: string
  status: string
  focus: string
}

interface Discussion {
  id: string
  topic: string
  expert_count: number
  status: string
  created_at: string
  pinned_at: string | null
  panelists: Panelist[]
  messages: unknown[]
  message_count: number
  panelist_count: number
  consensus?: unknown[]
  divergence?: unknown[]
}

const SEED_PANELISTS: Record<string, Panelist[]> = {
  'd-seed-001': [
    { id: 'p-seed-001', discussion_id: 'd-seed-001', name: '张澜', role: 'host', title: '资深科技媒体人', stance: '中立主持', color: '#FFD54F', status: 'standby', focus: '等待讨论开始...' },
    { id: 'p-seed-002', discussion_id: 'd-seed-001', name: '李明远', role: 'expert', title: 'AI研究院首席科学家', stance: 'AI将极大增强而非取代人类创造力', color: '#4FC3F7', status: 'standby', focus: '准备发表观点...' },
    { id: 'p-seed-003', discussion_id: 'd-seed-001', name: '王若曦', role: 'expert', title: '当代艺术家', stance: 'AI冲击创意行业的底层逻辑令人担忧', color: '#EF5350', status: 'standby', focus: '准备发表观点...' },
    { id: 'p-seed-004', discussion_id: 'd-seed-001', name: '陈建国', role: 'expert', title: '教育政策研究员', stance: '关键在于教育体系如何培养人机协作能力', color: '#66BB6A', status: 'standby', focus: '准备发表观点...' },
    { id: 'p-seed-005', discussion_id: 'd-seed-001', name: '赵敏', role: 'expert', title: '科技哲学教授', stance: '需要重新定义创造力的概念边界', color: '#AB47BC', status: 'standby', focus: '准备发表观点...' },
  ],
  'd-seed-002': [
    { id: 'p-seed-006', discussion_id: 'd-seed-002', name: '陈思远', role: 'host', title: '财经频道主持人', stance: '中立，关注数据与趋势', color: '#FFD54F', status: 'standby', focus: '等待讨论开始...' },
    { id: 'p-seed-007', discussion_id: 'd-seed-002', name: '刘佳', role: 'expert', title: '人力资源管理专家', stance: '混合办公是必然趋势', color: '#4FC3F7', status: 'standby', focus: '准备发表观点...' },
    { id: 'p-seed-008', discussion_id: 'd-seed-002', name: '王志强', role: 'expert', title: '大型企业CEO', stance: '面对面协作不可替代', color: '#EF5350', status: 'standby', focus: '准备发表观点...' },
    { id: 'p-seed-009', discussion_id: 'd-seed-002', name: '林小雨', role: 'expert', title: '数字游民社区创始人', stance: '自由是生产力的核心驱动力', color: '#66BB6A', status: 'standby', focus: '准备发表观点...' },
  ],
  'd-seed-003': [
    { id: 'p-seed-010', discussion_id: 'd-seed-003', name: '周明辉', role: 'host', title: '科技伦理评论员', stance: '中立主持', color: '#FFD54F', status: 'speaking', focus: '正在进行开场发言...' },
    { id: 'p-seed-011', discussion_id: 'd-seed-003', name: '吴浩然', role: 'expert', title: '自动驾驶算法工程师', stance: '技术方案可以化解伦理困境', color: '#4FC3F7', status: 'standby', focus: '倾听中...' },
    { id: 'p-seed-012', discussion_id: 'd-seed-003', name: '郑雅文', role: 'expert', title: '伦理学教授', stance: '算法偏见需立法约束', color: '#EF5350', status: 'standby', focus: '倾听中...' },
    { id: 'p-seed-013', discussion_id: 'd-seed-003', name: '马洪涛', role: 'expert', title: '保险公司精算师', stance: '风险评估应由市场机制调节', color: '#66BB6A', status: 'standby', focus: '倾听中...' },
    { id: 'p-seed-014', discussion_id: 'd-seed-003', name: '孙丽华', role: 'expert', title: '交通事故律师', stance: '法律责任归属亟待明确', color: '#AB47BC', status: 'standby', focus: '倾听中...' },
  ],
}

const SEED_MESSAGES: Record<string, unknown[]> = {
  'd-seed-003': [
    { id: 'm-003-1', discussion_id: 'd-seed-003', panelist_id: 'p-seed-010', name: '周明辉', title: '科技伦理评论员', color: '#FFD54F', content: '各位嘉宾，欢迎来到今天的圆桌讨论。今天我们将探讨自动驾驶汽车的电车难题。', type: 'opening', seq: 1, created_at: '2026-06-26T12:01:00Z' },
    { id: 'm-003-2', discussion_id: 'd-seed-003', panelist_id: 'p-seed-011', name: '吴浩然', title: '自动驾驶算法工程师', color: '#4FC3F7', content: '我认为电车难题被过度渲染了。自动驾驶系统通过提前预警和全局路径规划，可以大幅降低需要做出极端决策的概率。', type: 'statement', seq: 2, created_at: '2026-06-26T12:02:00Z' },
    { id: 'm-003-3', discussion_id: 'd-seed-003', panelist_id: 'p-seed-012', name: '郑雅文', title: '伦理学教授', color: '#EF5350', content: '问题在于谁来定义这些规则？没有法律框架的算法决策本身就是伦理真空。', type: 'rebuttal', seq: 3, created_at: '2026-06-26T12:03:00Z' },
  ],
}

const SEED_CONSENSUS: Record<string, unknown[]> = {
  'd-seed-003': [
    { id: 'c-003-1', discussion_id: 'd-seed-003', content: '各方认可自动驾驶需要更完善的法律和伦理框架', confidence: 0.85, updated_at: '2026-06-26T12:04:00Z' },
  ],
}

const SEED_DIVERGENCE: Record<string, unknown[]> = {
  'd-seed-003': [
    { id: 'dv-003-1', discussion_id: 'd-seed-003', content: '对技术方案能否完全解决伦理问题存在分歧', perspectives: ['技术可以化解', '法律必须先于技术'], updated_at: '2026-06-26T12:04:00Z' },
  ],
}

// ---- 讨论存储（可变状态） ----

const discussions: Discussion[] = [
  {
    id: 'd-seed-001', topic: 'AI 是否会取代人类创造力？', expert_count: 4, status: 'pending',
    created_at: '2026-06-26T10:00:00Z', pinned_at: null,
    get panelists() { return SEED_PANELISTS['d-seed-001'] ?? [] },
    get messages() { return SEED_MESSAGES['d-seed-001'] ?? [] },
    get message_count() { return (SEED_MESSAGES['d-seed-001'] ?? []).length },
    panelist_count: (SEED_PANELISTS['d-seed-001'] ?? []).length,
    get consensus() { return SEED_CONSENSUS['d-seed-001'] ?? [] },
    get divergence() { return SEED_DIVERGENCE['d-seed-001'] ?? [] },
  },
  {
    id: 'd-seed-002', topic: '远程办公是否会成为未来主流工作方式？', expert_count: 3, status: 'pending',
    created_at: '2026-06-26T11:00:00Z', pinned_at: '2026-06-26T15:00:00Z',
    get panelists() { return SEED_PANELISTS['d-seed-002'] ?? [] },
    get messages() { return SEED_MESSAGES['d-seed-002'] ?? [] },
    get message_count() { return (SEED_MESSAGES['d-seed-002'] ?? []).length },
    panelist_count: (SEED_PANELISTS['d-seed-002'] ?? []).length,
    get consensus() { return SEED_CONSENSUS['d-seed-002'] ?? [] },
    get divergence() { return SEED_DIVERGENCE['d-seed-002'] ?? [] },
  },
  {
    id: 'd-seed-003', topic: '自动驾驶汽车的电车难题：算法应该优先保护谁？', expert_count: 4, status: 'live',
    created_at: '2026-06-26T12:00:00Z', pinned_at: null,
    get panelists() { return SEED_PANELISTS['d-seed-003'] ?? [] },
    get messages() { return SEED_MESSAGES['d-seed-003'] ?? [] },
    get message_count() { return (SEED_MESSAGES['d-seed-003'] ?? []).length },
    panelist_count: (SEED_PANELISTS['d-seed-003'] ?? []).length,
    get consensus() { return SEED_CONSENSUS['d-seed-003'] ?? [] },
    get divergence() { return SEED_DIVERGENCE['d-seed-003'] ?? [] },
  },
  {
    id: 'd-seed-004', topic: 'AI 教育工具会缩小还是扩大教育不公平？', expert_count: 3, status: 'pending',
    created_at: '2026-06-26T13:00:00Z', pinned_at: null,
    panelists: [
      { id: 'p-seed-015', discussion_id: 'd-seed-004', name: '何思琪', role: 'host', title: '教育媒体主编', stance: '中立，关注实证', color: '#FFD54F', status: 'standby', focus: '等待讨论开始...' },
      { id: 'p-seed-016', discussion_id: 'd-seed-004', name: '张磊', role: 'expert', title: '在线教育平台创始人', stance: 'AI是最公平的老师', color: '#4FC3F7', status: 'standby', focus: '准备发表观点...' },
      { id: 'p-seed-017', discussion_id: 'd-seed-004', name: '李红梅', role: 'expert', title: '乡村一线教师', stance: '硬件与网络鸿沟才是真障碍', color: '#EF5350', status: 'standby', focus: '准备发表观点...' },
      { id: 'p-seed-018', discussion_id: 'd-seed-004', name: '黄文斌', role: 'expert', title: '教育政策研究者', stance: '关键在于公共资源如何配置', color: '#66BB6A', status: 'standby', focus: '准备发表观点...' },
    ],
    messages: [],
    message_count: 0,
    panelist_count: 4,
    consensus: [],
    divergence: [],
  },
  {
    id: 'd-seed-005', topic: '碳中和目标下，发展中国家如何平衡经济增长与减排？', expert_count: 4, status: 'pending',
    created_at: '2026-06-26T14:00:00Z', pinned_at: null,
    panelists: [
      { id: 'p-seed-019', discussion_id: 'd-seed-005', name: '杨帆', role: 'host', title: '国际新闻记者', stance: '中立主持', color: '#FFD54F', status: 'standby', focus: '等待讨论开始...' },
      { id: 'p-seed-020', discussion_id: 'd-seed-005', name: 'Andrew Chen', role: 'expert', title: '气候经济学家', stance: '碳交易机制是最优解', color: '#4FC3F7', status: 'standby', focus: '准备发表观点...' },
      { id: 'p-seed-021', discussion_id: 'd-seed-005', name: '萨拉·穆罕默德', role: 'expert', title: '发展中国家能源顾问', stance: '发达国家应承担历史责任', color: '#EF5350', status: 'standby', focus: '准备发表观点...' },
      { id: 'p-seed-022', discussion_id: 'd-seed-005', name: '高桥健一', role: 'expert', title: '可再生能源技术专家', stance: '技术突破将改变成本曲线', color: '#66BB6A', status: 'standby', focus: '准备发表观点...' },
      { id: 'p-seed-023', discussion_id: 'd-seed-005', name: 'Maria Silva', role: 'expert', title: '环保NGO负责人', stance: '不能以发展为名推迟减排行动', color: '#AB47BC', status: 'standby', focus: '准备发表观点...' },
    ],
    messages: [],
    message_count: 0,
    panelist_count: 5,
    consensus: [],
    divergence: [],
  },
]

// 创建讨论时返回的模拟 panelists
const GENERATED_PANELISTS: Panelist[] = [
  { id: 'p-new-001', discussion_id: '', name: '陈思明', role: 'host', title: '资深科技评论员', stance: '中立主持，善于引导多元视角', color: '#FFD54F', status: 'standby', focus: '等待讨论开始...' },
  { id: 'p-new-002', discussion_id: '', name: '刘知远', role: 'expert', title: 'AI安全研究员', stance: 'AI发展需要严格的伦理框架约束', color: '#4FC3F7', status: 'standby', focus: '准备发表观点...' },
  { id: 'p-new-003', discussion_id: '', name: '赵思涵', role: 'expert', title: '科技创业者', stance: '创新不应被过度监管所扼杀', color: '#EF5350', status: 'standby', focus: '准备发表观点...' },
  { id: 'p-new-004', discussion_id: '', name: '周建华', role: 'expert', title: '法律科技专家', stance: '监管与技术发展需要平衡', color: '#66BB6A', status: 'standby', focus: '准备发表观点...' },
  { id: 'p-new-005', discussion_id: '', name: '林婉儿', role: 'expert', title: '公众政策研究员', stance: 'AI治理需要公众参与和透明决策', color: '#AB47BC', status: 'standby', focus: '准备发表观点...' },
]

const CONFIRM_MESSAGES: Record<string, unknown[]> = {
  'd-seed-001': [
    { id: 'm-confirm-1', discussion_id: 'd-seed-001', panelist_id: 'p-seed-001', name: '张澜', title: '资深科技媒体人', color: '#FFD54F', content: '各位嘉宾，欢迎来到今天的圆桌讨论。我们今天要探讨一个既有深度又有广度的话题——AI是否会取代人类创造力？', type: 'opening', seq: 1, created_at: new Date().toISOString() },
  ],
}

// ---- 工具函数 ----

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true',
  })
  res.end(JSON.stringify(data))
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
  })
}

function getRouteParams(pathname: string, pattern: RegExp): Record<string, string> | null {
  const match = pathname.match(pattern)
  return match?.groups ? { ...match.groups } : null
}

// ---- SSE 流实现 ----

function handleSSE(req: IncomingMessage, res: ServerResponse, discussionId: string) {
  const discussion = discussions.find(d => d.id === discussionId)

  if (!discussion) {
    json(res, { error: '讨论不存在' }, 404)
    return
  }

  // 仅 live 状态支持 SSE 流
  if (discussion.status !== 'live') {
    json(res, { error: `讨论状态为 ${discussion.status}，无法连接流` }, 400)
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Credentials': 'true',
  })

  let aborted = false
  req.on('close', () => { aborted = true })

  const sendEvent = (event: string, data: unknown) => {
    if (aborted) return
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    } catch {
      aborted = true
    }
  }

  const PANELISTS = discussion.panelists
  const HOST = PANELISTS.find(p => p.role === 'host')!

  // 发送序列中的事件
  let eventIndex = 0
  const events = [
    // 初始状态：发送每个 panelist 的状态
    ...PANELISTS.map(p => ({
      delay: 100,
      type: 'panelist_status',
      data: { panelist_id: p.id, status: p.status, focus: p.focus },
    })),
    // Host speaks
    { delay: 500, type: 'panelist_status', data: { panelist_id: HOST.id, status: 'speaking', focus: '正在发表开场白...' } },
    { delay: 100, type: 'message_token', data: { panelist_id: HOST.id, token: '各位', seq: 1 } },
    { delay: 50, type: 'message_token', data: { panelist_id: HOST.id, token: '嘉宾，', seq: 1 } },
    { delay: 50, type: 'message_token', data: { panelist_id: HOST.id, token: '欢迎', seq: 1 } },
    { delay: 50, type: 'message_token', data: { panelist_id: HOST.id, token: '来到', seq: 1 } },
    { delay: 50, type: 'message_token', data: { panelist_id: HOST.id, token: '今天的', seq: 1 } },
    { delay: 50, type: 'message_token', data: { panelist_id: HOST.id, token: '圆桌讨论。', seq: 1 } },
    { delay: 300, type: 'transcript_message', data: {
      id: 'm-sse-1', discussion_id: discussionId, panelist_id: HOST.id,
      name: HOST.name, title: HOST.title, color: HOST.color,
      content: '各位嘉宾，欢迎来到今天的圆桌讨论。让我们开始探讨这个话题。',
      type: 'opening', seq: 1, created_at: new Date().toISOString(),
    } },
    // 3 秒后模拟讨论结束
    { delay: 1500, type: 'panelist_status', data: { panelist_id: HOST.id, status: 'standby', focus: '发言完毕' } },
  ]

  function sendNext() {
    if (aborted) return
    if (eventIndex >= events.length) return

    const evt = events[eventIndex++]
    setTimeout(() => {
      sendEvent(evt.type, evt.data)
      sendNext()
    }, evt.delay)
  }

  sendNext()
}

// ---- 路由处理 ----

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://localhost:3001`)
  const pathname = url.pathname
  const method = req.method ?? 'GET'

  // CORS 预检
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    })
    res.end()
    return
  }

  // ===== Health check =====
  if (pathname === '/api/health' && method === 'GET') {
    json(res, { status: 'ok', timestamp: new Date().toISOString() })
    return
  }

  // ===== SSE Stream =====
  const streamMatch = pathname.match(/^\/api\/discussions\/([^/]+)\/stream$/)
  if (streamMatch && method === 'GET') {
    handleSSE(req, res, streamMatch[1])
    return
  }

  // ===== GET /api/discussions — 列表 =====
  if (pathname === '/api/discussions' && method === 'GET') {
    // 按 pinned_at 排序：已置顶优先，然后按时间
    const sorted = [...discussions].sort((a, b) => {
      if (a.pinned_at && !b.pinned_at) return -1
      if (!a.pinned_at && b.pinned_at) return 1
      if (a.pinned_at && b.pinned_at) return b.pinned_at.localeCompare(a.pinned_at)
      return b.created_at.localeCompare(a.created_at)
    })
    json(res, sorted)
    return
  }

  // ===== POST /api/discussions — 创建 =====
  if (pathname === '/api/discussions' && method === 'POST') {
    const body = await parseBody(req)
    const topic = String(body.topic ?? '').trim()
    const expertCount = parseInt(String(body.expert_count ?? '4'), 10)

    if (!topic) {
      json(res, { error: '话题不能为空' }, 400)
      return
    }
    if (expertCount < 1 || expertCount > 8) {
      json(res, { error: '专家人数必须在 1-8 之间' }, 400)
      return
    }

    const newId = `d-new-${Date.now()}`
    const panelists = GENERATED_PANELISTS.slice(0, expertCount + 1).map(p => ({
      ...p,
      id: `p-new-${randomUUID().slice(0, 8)}`,
      discussion_id: newId,
    }))

    const newDiscussion: Discussion = {
      id: newId,
      topic,
      expert_count: expertCount,
      status: 'pending',
      created_at: new Date().toISOString(),
      pinned_at: null,
      panelists,
      messages: [],
      message_count: 0,
      panelist_count: panelists.length,
      consensus: [],
      divergence: [],
    }

    discussions.unshift(newDiscussion)
    json(res, { ...newDiscussion, panelists }, 201)
    return
  }

  // ===== GET /api/discussions/:id — 单个讨论 =====
  const getMatch = pathname.match(/^\/api\/discussions\/([^/]+)$/)
  if (getMatch && method === 'GET') {
    const discussion = discussions.find(d => d.id === getMatch[1])
    if (!discussion) {
      json(res, { error: '讨论不存在' }, 404)
      return
    }
    json(res, discussion)
    return
  }

  // ===== DELETE /api/discussions/:id =====
  const deleteMatch = pathname.match(/^\/api\/discussions\/([^/]+)$/)
  if (deleteMatch && method === 'DELETE') {
    const idx = discussions.findIndex(d => d.id === deleteMatch[1])
    if (idx === -1) {
      json(res, { error: '讨论不存在' }, 404)
      return
    }
    discussions.splice(idx, 1)
    json(res, { success: true })
    return
  }

  // ===== PATCH /api/discussions/:id/pin =====
  const pinMatch = pathname.match(/^\/api\/discussions\/([^/]+)\/pin$/)
  if (pinMatch && method === 'PATCH') {
    const discussion = discussions.find(d => d.id === pinMatch[1])
    if (!discussion) {
      json(res, { error: '讨论不存在' }, 404)
      return
    }
    const body = await parseBody(req)
    discussion.pinned_at = body.pinned ? new Date().toISOString() : null
    json(res, discussion)
    return
  }

  // ===== POST /api/discussions/:id/confirm — 确认并开始 =====
  const confirmMatch = pathname.match(/^\/api\/discussions\/([^/]+)\/confirm$/)
  if (confirmMatch && method === 'POST') {
    const discussion = discussions.find(d => d.id === confirmMatch[1])
    if (!discussion) {
      json(res, { error: '讨论不存在' }, 404)
      return
    }
    if (discussion.status !== 'pending') {
      json(res, { error: '讨论已开始或已结束' }, 400)
      return
    }

    discussion.status = 'live'
    const messages = [
      ...(CONFIRM_MESSAGES[discussion.id] ?? [
        {
          id: `m-confirm-${Date.now()}`,
          discussion_id: discussion.id,
          panelist_id: discussion.panelists[0]?.id ?? '',
          name: discussion.panelists[0]?.name ?? '',
          title: discussion.panelists[0]?.title ?? '',
          color: discussion.panelists[0]?.color ?? '#888',
          content: '各位嘉宾，欢迎来到今天的圆桌讨论。让我们开始今天的精彩对话。',
          type: 'opening',
          seq: 1,
          created_at: new Date().toISOString(),
        },
      ]),
    ]

    json(res, {
      ...discussion,
      panelists: discussion.panelists,
      messages,
      consensus: discussion.consensus ?? [],
      divergence: discussion.divergence ?? [],
    })
    return
  }

  // ===== POST /api/discussions/:id/start =====
  const startMatch = pathname.match(/^\/api\/discussions\/([^/]+)\/start$/)
  if (startMatch && method === 'POST') {
    const discussion = discussions.find(d => d.id === startMatch[1])
    if (!discussion) {
      json(res, { error: '讨论不存在' }, 404)
      return
    }
    if (discussion.status !== 'pending') {
      json(res, { error: '讨论已开始或已结束' }, 400)
      return
    }

    discussion.status = 'live'
    json(res, discussion)
    return
  }

  // ===== POST /api/discussions/:id/next-step =====
  const nextStepMatch = pathname.match(/^\/api\/discussions\/([^/]+)\/next-step$/)
  if (nextStepMatch && method === 'POST') {
    const discussion = discussions.find(d => d.id === nextStepMatch[1])
    if (!discussion) {
      json(res, { error: '讨论不存在' }, 404)
      return
    }
    json(res, discussion)
    return
  }

  // ===== 404 =====
  json(res, { error: 'Not Found' }, 404)
}

// ---- 启动服务器 ----

const PORT = parseInt(process.env.MOCK_SERVER_PORT || '3001', 10)

const server = createServer(handleRequest)

server.listen(PORT, () => {
  console.log(`[E2E Mock Server] 运行在 http://localhost:${PORT}`)
})

// 优雅退出
process.on('SIGTERM', () => server.close())
process.on('SIGINT', () => server.close())
