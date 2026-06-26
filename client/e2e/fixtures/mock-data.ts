import type { Discussion, Panelist, Message, ConsensusPoint, DivergencePoint } from '../../src/types'

// ===== Panelist 工厂 =====

export function createMockPanelist(overrides: Partial<Panelist> = {}): Panelist {
  return {
    id: 'p-mock-001',
    discussion_id: 'd-mock-001',
    name: '张澜',
    role: 'host',
    title: '资深科技媒体人',
    stance: '中立主持，擅长引导深度对话',
    color: '#FFD54F',
    status: 'standby',
    focus: '等待讨论开始...',
    ...overrides,
  }
}

// ===== Message 工厂 =====

export function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm-mock-001',
    discussion_id: 'd-mock-001',
    panelist_id: 'p-mock-001',
    name: '张澜',
    title: '资深科技媒体人',
    color: '#FFD54F',
    content: '各位嘉宾，欢迎来到今天的圆桌讨论。',
    type: 'opening',
    seq: 1,
    created_at: '2026-06-26T10:00:00Z',
    ...overrides,
  }
}

// ===== Discussion 工厂 =====

export function createMockDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  return {
    id: 'd-mock-001',
    topic: 'AI 是否会取代人类创造力？',
    expert_count: 4,
    status: 'pending',
    created_at: '2026-06-26T10:00:00Z',
    pinned_at: null,
    ...overrides,
  }
}

// ===== 完整讨论数据（含 panelists + messages） =====

export const MOCK_DISCUSSIONS = [
  {
    id: 'd-seed-001',
    topic: 'AI 是否会取代人类创造力？',
    expert_count: 4,
    status: 'pending' as const,
    created_at: '2026-06-26T10:00:00Z',
    pinned_at: null,
    panelists: [
      { id: 'p-seed-001', discussion_id: 'd-seed-001', name: '张澜', role: 'host' as const, title: '资深科技媒体人', stance: '中立主持，擅长引导深度对话', color: '#FFD54F', status: 'standby' as const, focus: '等待讨论开始...' },
      { id: 'p-seed-002', discussion_id: 'd-seed-001', name: '李明远', role: 'expert' as const, title: 'AI研究院首席科学家', stance: 'AI将极大增强而非取代人类创造力', color: '#4FC3F7', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-003', discussion_id: 'd-seed-001', name: '王若曦', role: 'expert' as const, title: '当代艺术家', stance: 'AI冲击创意行业的底层逻辑令人担忧', color: '#EF5350', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-004', discussion_id: 'd-seed-001', name: '陈建国', role: 'expert' as const, title: '教育政策研究员', stance: '关键在于教育体系如何培养人机协作能力', color: '#66BB6A', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-005', discussion_id: 'd-seed-001', name: '赵敏', role: 'expert' as const, title: '科技哲学教授', stance: '需要重新定义"创造力"的概念边界', color: '#AB47BC', status: 'standby' as const, focus: '准备发表观点...' },
    ],
    messages: [] as Message[],
    message_count: 0,
    panelist_count: 5,
  },
  {
    id: 'd-seed-002',
    topic: '远程办公是否会成为未来主流工作方式？',
    expert_count: 3,
    status: 'pending' as const,
    created_at: '2026-06-26T11:00:00Z',
    pinned_at: '2026-06-26T15:00:00Z',
    panelists: [
      { id: 'p-seed-006', discussion_id: 'd-seed-002', name: '陈思远', role: 'host' as const, title: '财经频道主持人', stance: '中立，关注数据与趋势', color: '#FFD54F', status: 'standby' as const, focus: '等待讨论开始...' },
      { id: 'p-seed-007', discussion_id: 'd-seed-002', name: '刘佳', role: 'expert' as const, title: '人力资源管理专家', stance: '混合办公是必然趋势', color: '#4FC3F7', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-008', discussion_id: 'd-seed-002', name: '王志强', role: 'expert' as const, title: '大型企业CEO', stance: '面对面协作不可替代', color: '#EF5350', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-009', discussion_id: 'd-seed-002', name: '林小雨', role: 'expert' as const, title: '数字游民社区创始人', stance: '自由是生产力的核心驱动力', color: '#66BB6A', status: 'standby' as const, focus: '准备发表观点...' },
    ],
    messages: [] as Message[],
    message_count: 0,
    panelist_count: 4,
  },
  {
    id: 'd-seed-003',
    topic: '自动驾驶汽车的电车难题：算法应该优先保护谁？',
    expert_count: 4,
    status: 'live' as const,
    created_at: '2026-06-26T12:00:00Z',
    pinned_at: null,
    panelists: [
      { id: 'p-seed-010', discussion_id: 'd-seed-003', name: '周明辉', role: 'host' as const, title: '科技伦理评论员', stance: '中立主持', color: '#FFD54F', status: 'speaking' as const, focus: '正在进行开场发言...' },
      { id: 'p-seed-011', discussion_id: 'd-seed-003', name: '吴浩然', role: 'expert' as const, title: '自动驾驶算法工程师', stance: '技术方案可以化解伦理困境', color: '#4FC3F7', status: 'standby' as const, focus: '倾听中...' },
      { id: 'p-seed-012', discussion_id: 'd-seed-003', name: '郑雅文', role: 'expert' as const, title: '伦理学教授', stance: '算法偏见需立法约束', color: '#EF5350', status: 'standby' as const, focus: '倾听中...' },
      { id: 'p-seed-013', discussion_id: 'd-seed-003', name: '马洪涛', role: 'expert' as const, title: '保险公司精算师', stance: '风险评估应由市场机制调节', color: '#66BB6A', status: 'standby' as const, focus: '倾听中...' },
      { id: 'p-seed-014', discussion_id: 'd-seed-003', name: '孙丽华', role: 'expert' as const, title: '交通事故律师', stance: '法律责任归属亟待明确', color: '#AB47BC', status: 'standby' as const, focus: '倾听中...' },
    ],
    messages: [
      { id: 'm-seed-003-1', discussion_id: 'd-seed-003', panelist_id: 'p-seed-010', name: '周明辉', title: '科技伦理评论员', color: '#FFD54F', content: '各位嘉宾，欢迎来到今天的圆桌讨论。今天我们将探讨一个极具挑战性的议题——自动驾驶汽车的电车难题：算法应该优先保护谁？这是一个涉及技术、伦理、法律和保险多个维度的问题。', type: 'opening' as const, seq: 1, created_at: '2026-06-26T12:01:00Z' },
      { id: 'm-seed-003-2', discussion_id: 'd-seed-003', panelist_id: 'p-seed-011', name: '吴浩然', title: '自动驾驶算法工程师', color: '#4FC3F7', content: '我认为电车难题被过度渲染了。实际上，自动驾驶系统通过提前预警和全局路径规划，可以大幅降低需要做出这种极端决策的概率。技术上，我们可以通过V2X车路协同和冗余传感器来避免大多数危险场景。', type: 'statement' as const, seq: 2, created_at: '2026-06-26T12:02:00Z' },
      { id: 'm-seed-003-3', discussion_id: 'd-seed-003', panelist_id: 'p-seed-012', name: '郑雅文', title: '伦理学教授', color: '#EF5350', content: '我不同意这种技术乐观主义。即使概率很低，极端场景仍然会出现。问题在于：谁来决定算法在那些场景下的行为？目前没有任何法律框架来规范这些道德决策，这本身就是一种伦理真空。', type: 'rebuttal' as const, seq: 3, created_at: '2026-06-26T12:03:00Z' },
    ],
    consensus: [
      { id: 'c-seed-003-1', discussion_id: 'd-seed-003', content: '各方认可自动驾驶需要更完善的法律和伦理框架', confidence: 0.85, updated_at: '2026-06-26T12:04:00Z' },
    ] as ConsensusPoint[],
    divergence: [
      { id: 'dv-seed-003-1', discussion_id: 'd-seed-003', content: '对技术方案能否完全解决伦理问题存在分歧', perspectives: ['技术可以化解', '法律必须先于技术'], updated_at: '2026-06-26T12:04:00Z' },
    ] as DivergencePoint[],
    message_count: 3,
    panelist_count: 5,
  },
  {
    id: 'd-seed-004',
    topic: 'AI 教育工具会缩小还是扩大教育不公平？',
    expert_count: 3,
    status: 'pending' as const,
    created_at: '2026-06-26T13:00:00Z',
    pinned_at: null,
    panelists: [
      { id: 'p-seed-015', discussion_id: 'd-seed-004', name: '何思琪', role: 'host' as const, title: '教育媒体主编', stance: '中立，关注实证', color: '#FFD54F', status: 'standby' as const, focus: '等待讨论开始...' },
      { id: 'p-seed-016', discussion_id: 'd-seed-004', name: '张磊', role: 'expert' as const, title: '在线教育平台创始人', stance: 'AI是最公平的老师', color: '#4FC3F7', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-017', discussion_id: 'd-seed-004', name: '李红梅', role: 'expert' as const, title: '乡村一线教师', stance: '硬件与网络鸿沟才是真障碍', color: '#EF5350', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-018', discussion_id: 'd-seed-004', name: '黄文斌', role: 'expert' as const, title: '教育政策研究者', stance: '关键在于公共资源如何配置', color: '#66BB6A', status: 'standby' as const, focus: '准备发表观点...' },
    ],
    messages: [] as Message[],
    message_count: 0,
    panelist_count: 4,
  },
  {
    id: 'd-seed-005',
    topic: '碳中和目标下，发展中国家如何平衡经济增长与减排？',
    expert_count: 4,
    status: 'pending' as const,
    created_at: '2026-06-26T14:00:00Z',
    pinned_at: null,
    panelists: [
      { id: 'p-seed-019', discussion_id: 'd-seed-005', name: '杨帆', role: 'host' as const, title: '国际新闻记者', stance: '中立主持', color: '#FFD54F', status: 'standby' as const, focus: '等待讨论开始...' },
      { id: 'p-seed-020', discussion_id: 'd-seed-005', name: 'Andrew Chen', role: 'expert' as const, title: '气候经济学家', stance: '碳交易机制是最优解', color: '#4FC3F7', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-021', discussion_id: 'd-seed-005', name: '萨拉·穆罕默德', role: 'expert' as const, title: '发展中国家能源顾问', stance: '发达国家应承担历史责任', color: '#EF5350', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-022', discussion_id: 'd-seed-005', name: '高桥健一', role: 'expert' as const, title: '可再生能源技术专家', stance: '技术突破将改变成本曲线', color: '#66BB6A', status: 'standby' as const, focus: '准备发表观点...' },
      { id: 'p-seed-023', discussion_id: 'd-seed-005', name: 'Maria Silva', role: 'expert' as const, title: '环保NGO负责人', stance: '不能以发展为名推迟减排行动', color: '#AB47BC', status: 'standby' as const, focus: '准备发表观点...' },
    ],
    messages: [] as Message[],
    message_count: 0,
    panelist_count: 5,
  },
]

// ===== 创建讨论时返回的模拟 panelists =====

export const MOCK_GENERATED_PANELISTS: Panelist[] = [
  { id: 'p-new-001', discussion_id: 'd-new-001', name: '陈思明', role: 'host', title: '资深科技评论员', stance: '中立主持，善于引导多元视角', color: '#FFD54F', status: 'standby', focus: '等待讨论开始...' },
  { id: 'p-new-002', discussion_id: 'd-new-001', name: '刘知远', role: 'expert', title: 'AI安全研究员', stance: 'AI发展需要严格的伦理框架约束', color: '#4FC3F7', status: 'standby', focus: '准备发表观点...' },
  { id: 'p-new-003', discussion_id: 'd-new-001', name: '赵思涵', role: 'expert', title: '科技创业者', stance: '创新不应被过度监管所扼杀', color: '#EF5350', status: 'standby', focus: '准备发表观点...' },
  { id: 'p-new-004', discussion_id: 'd-new-001', name: '周建华', role: 'expert', title: '法律科技专家', stance: '监管与技术发展需要平衡', color: '#66BB6A', status: 'standby', focus: '准备发表观点...' },
  { id: 'p-new-005', discussion_id: 'd-new-001', name: '林婉儿', role: 'expert', title: '公众政策研究员', stance: 'AI治理需要公众参与和透明决策', color: '#AB47BC', status: 'standby', focus: '准备发表观点...' },
]
