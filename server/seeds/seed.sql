-- 样例数据（≥5 条预设讨论话题）
-- 运行方式: sqlite3 server/data/panel.db < server/seeds/seed.sql

-- 讨论 1: AI 与人类创造力
INSERT INTO discussions (id, topic, expert_count, status, created_at) VALUES
('d-seed-001', 'AI是否会取代人类创造力？', 4, 'pending', '2026-06-25T10:00:00Z');

INSERT INTO panelists (id, discussion_id, name, role, title, stance, color) VALUES
('p-seed-001', 'd-seed-001', '张澜', 'host', '资深科技媒体人', '中立主持，擅长引导深度对话', '#FFD54F'),
('p-seed-002', 'd-seed-001', '李明远', 'expert', 'AI研究院首席科学家', 'AI将极大增强而非取代人类创造力', '#4FC3F7'),
('p-seed-003', 'd-seed-001', '王若曦', 'expert', '当代艺术家', 'AI冲击创意行业的底层逻辑令人担忧', '#EF5350'),
('p-seed-004', 'd-seed-001', '陈建国', 'expert', '教育政策研究员', '关键在于教育体系如何培养人机协作能力', '#66BB6A'),
('p-seed-005', 'd-seed-001', '赵敏', 'expert', '科技哲学教授', '需要重新定义"创造力"的概念边界', '#AB47BC');

-- 讨论 2: 远程办公未来
INSERT INTO discussions (id, topic, expert_count, status, created_at) VALUES
('d-seed-002', '远程办公是否会成为未来主流工作方式？', 3, 'pending', '2026-06-25T11:00:00Z');

INSERT INTO panelists (id, discussion_id, name, role, title, stance, color) VALUES
('p-seed-006', 'd-seed-002', '陈思远', 'host', '财经频道主持人', '中立，关注数据与趋势', '#FFD54F'),
('p-seed-007', 'd-seed-002', '刘佳', 'expert', '人力资源管理专家', '混合办公是必然趋势', '#4FC3F7'),
('p-seed-008', 'd-seed-002', '王志强', 'expert', '大型企业CEO', '面对面协作不可替代', '#EF5350'),
('p-seed-009', 'd-seed-002', '林小雨', 'expert', '数字游民社区创始人', '自由是生产力的核心驱动力', '#66BB6A');

-- 讨论 3: 自动驾驶伦理
INSERT INTO discussions (id, topic, expert_count, status, created_at) VALUES
('d-seed-003', '自动驾驶汽车的电车难题：算法应该优先保护谁？', 4, 'pending', '2026-06-25T12:00:00Z');

INSERT INTO panelists (id, discussion_id, name, role, title, stance, color) VALUES
('p-seed-010', 'd-seed-003', '周明辉', 'host', '科技伦理评论员', '中立主持', '#FFD54F'),
('p-seed-011', 'd-seed-003', '吴浩然', 'expert', '自动驾驶算法工程师', '技术方案可以化解伦理困境', '#4FC3F7'),
('p-seed-012', 'd-seed-003', '郑雅文', 'expert', '伦理学教授', '算法偏见需立法约束', '#EF5350'),
('p-seed-013', 'd-seed-003', '马洪涛', 'expert', '保险公司精算师', '风险评估应由市场机制调节', '#66BB6A'),
('p-seed-014', 'd-seed-003', '孙丽华', 'expert', '交通事故律师', '法律责任归属亟待明确', '#AB47BC');

-- 讨论 4: 教育公平
INSERT INTO discussions (id, topic, expert_count, status, created_at) VALUES
('d-seed-004', 'AI教育工具会缩小还是扩大教育不公平？', 3, 'pending', '2026-06-25T13:00:00Z');

INSERT INTO panelists (id, discussion_id, name, role, title, stance, color) VALUES
('p-seed-015', 'd-seed-004', '何思琪', 'host', '教育媒体主编', '中立，关注实证', '#FFD54F'),
('p-seed-016', 'd-seed-004', '张磊', 'expert', '在线教育平台创始人', 'AI是最公平的老师', '#4FC3F7'),
('p-seed-017', 'd-seed-004', '李红梅', 'expert', '乡村一线教师', '硬件与网络鸿沟才是真障碍', '#EF5350'),
('p-seed-018', 'd-seed-004', '黄文斌', 'expert', '教育政策研究者', '关键在于公共资源如何配置', '#66BB6A');

-- 讨论 5: 碳中和经济
INSERT INTO discussions (id, topic, expert_count, status, created_at) VALUES
('d-seed-005', '碳中和目标下，发展中国家如何平衡经济增长与减排？', 4, 'pending', '2026-06-25T14:00:00Z');

INSERT INTO panelists (id, discussion_id, name, role, title, stance, color) VALUES
('p-seed-019', 'd-seed-005', '杨帆', 'host', '国际新闻记者', '中立主持', '#FFD54F'),
('p-seed-020', 'd-seed-005', 'Andrew Chen', 'expert', '气候经济学家', '碳交易机制是最优解', '#4FC3F7'),
('p-seed-021', 'd-seed-005', '萨拉·穆罕默德', 'expert', '发展中国家能源顾问', '发达国家应承担历史责任', '#EF5350'),
('p-seed-022', 'd-seed-005', '高桥健一', 'expert', '可再生能源技术专家', '技术突破将改变成本曲线', '#66BB6A'),
('p-seed-023', 'd-seed-005', 'Maria Silva', 'expert', '环保NGO负责人', '不能以发展为名推迟减排行动', '#AB47BC');
