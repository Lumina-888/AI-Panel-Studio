# AI Panel Studio

AI 圆桌讨论本地 Web 应用。用户输入话题并指定专家人数，系统调用 DeepSeek 大模型动态生成主持人+专家群像，驱动实时圆桌讨论，包含实时 Transcript、共识/分歧追踪、专家状态面板。

## 运行指南

### 前置要求

- Node.js ≥ 24
- pnpm ≥ 11

### 安装

```bash
# 安装前端依赖
cd client && pnpm install

# 安装后端依赖
cd ../server && pnpm install
```

### 启动开发环境

需要同时运行前端和后端：

```bash
# 终端 1：启动后端（端口 3001，热重载）
cd server
pnpm dev

# 终端 2：启动前端（端口 5173，自动代理 /api 到后端）
cd client
pnpm dev
```

浏览器访问 `http://localhost:5173`。

### 运行测试

```bash
# 前端单元测试
cd client && pnpm test

# 后端单元测试
cd server && pnpm test

# 后端集成测试（需要 DEEPSEEK_API_KEY）
cd server && pnpm test:integration

# E2E 测试
cd client && pnpm test:e2e
```

## 环境变量配置

在 `server/.env` 中配置（此文件不提交到 Git）：

```bash
# DeepSeek API 密钥（必需，否则无法进行 LLM 调用）
DEEPSEEK_API_KEY=sk-xxx

# 后端 HTTP 服务端口（可选，默认 3001）
PORT=3001

# SQLite 数据库文件路径（可选，默认 ./data/panel.db）
DATABASE_PATH=./data/panel.db
```

| 变量 | 默认值 | 必需 | 说明 |
|------|--------|------|------|
| `DEEPSEEK_API_KEY` | — | ✅ | DeepSeek API 密钥 |
| `PORT` | `3001` | ❌ | 后端服务端口 |
| `DATABASE_PATH` | `./data/panel.db` | ❌ | SQLite 数据库路径 |
| `CI` | — | ❌ | CI 模式标志（Playwright E2E 用） |

## 技术选型说明

| 层 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| 运行时 | Node.js | 24.15 | 最新 LTS，原生 TS 支持 |
| 包管理 | pnpm | 11.9 | 磁盘高效，monorepo 友好 |
| 前端框架 | React + TypeScript | 19 / 6.0 | 生态成熟，类型安全 |
| 构建工具 | Vite | 8.1 | 极速 HMR，零配置 |
| 路由 | React Router DOM | 7.18 | SPA 客户端路由 |
| 样式 | Tailwind CSS | 4.3 | 原子化 CSS，深色主题友好 |
| 状态管理 | Zustand | 5.0 | 轻量，支持多讨论并行隔离 |
| 后端框架 | Express + TypeScript | 5.1 / 5.8 | 简洁，生态丰富 |
| 运行时 | tsx | 4.22 | 直接运行 TS，开发热重载 |
| LLM 客户端 | OpenAI SDK | 4.73 | DeepSeek API 兼容 OpenAI 格式 |
| 数据库 | sql.js (SQLite WASM) | 1.14 | 零安装，本地文件存储，内存模式可选 |
| 数据验证 | Zod | 3.24 | 运行时类型校验，LLM 输出验证 |
| 实时通信 | SSE（Server-Sent Events） | 原生 | 单向推送，浏览器原生支持 |
| 单元测试 | Vitest | 4.x | Vite 原生集成，极速运行 |
| E2E 测试 | Playwright | 1.61 | 多浏览器，自动启停前后端 |
| 组件测试 | Testing Library | 16.3 | 用户视角测试 React 组件 |

## 项目结构

```
ai-panel-studio/
├── client/                     # 前端 React 应用
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   │   ├── background/     # 星空背景
│   │   │   ├── common/         # 通用组件（CyberCard、GradientButton、各类 Loader 等）
│   │   │   ├── consensus/      # 共识/分歧面板
│   │   │   ├── discussion/     # 讨论列表、创建弹窗、讨论房间
│   │   │   ├── layout/         # 三栏演播厅布局、Drawer、图标
│   │   │   ├── panelist/       # 专家状态侧栏
│   │   │   └── transcript/     # 实时 Transcript 流
│   │   ├── pages/              # HomePage、StudioLayout
│   │   ├── stores/             # Zustand stores（appStore、discussionStore）
│   │   ├── hooks/              # 自定义 hooks
│   │   └── types/              # 前端类型定义
│   ├── e2e/                    # Playwright E2E 测试
│   │   ├── mock-server/        # Mock API 服务器
│   │   ├── fixtures/           # 测试数据工厂
│   │   └── tests/              # E2E 测试用例（5 个 spec）
│   └── index.html
├── server/                     # 后端 Express 应用
│   ├── src/
│   │   ├── routes/             # API 路由
│   │   ├── services/           # 业务逻辑
│   │   │   ├── llm.ts          # DeepSeek API 客户端
│   │   │   ├── panelist.ts     # 嘉宾生成
│   │   │   ├── discussion.ts   # 发言调度与讨论编排
│   │   │   └── consensus.ts    # 共识/分歧提炼
│   │   ├── models/             # 数据模型
│   │   ├── types/              # 后端类型定义
│   │   └── utils/              # 错误处理等工具
│   ├── migrations/             # 数据库初始化脚本
│   ├── seeds/                  # 样例数据（5 条预设话题）
│   ├── data/                   # SQLite 数据库文件（Git 忽略）
│   └── tests/                  # 后端测试（8 个文件）
├── docs/                       # 开发文档
│   ├── PRD.md                  # 产品需求文档
│   ├── ER.md                   # 数据库 ER 图与 SQL Schema
│   └── API.md                  # API 详细文档
├── prompts/                    # 核心 Prompt 记录（≥5 段）
└── CLAUDE.md                   # Claude Code 项目指引
```

## 主要 API 列表

基础路径：`http://localhost:3001/api`

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `GET` | `/discussions` | 获取讨论列表（按置顶与时间排序） |
| `POST` | `/discussions` | 创建讨论（`{ topic, expert_count }`），自动生成嘉宾阵容 |
| `GET` | `/discussions/:id` | 获取讨论详情（含嘉宾、消息、共识/分歧） |
| `DELETE` | `/discussions/:id` | 删除讨论（级联删除关联数据） |
| `PATCH` | `/discussions/:id/pin` | 置顶/取消置顶讨论 |
| `POST` | `/discussions/:id/confirm` | 确认嘉宾名单并启动讨论 |
| `POST` | `/discussions/:id/next-step` | 逐步推进讨论（发言调度 → 生成 → 共识提炼） |
| `GET` | `/discussions/:id/stream` | SSE 实时讨论流 |

### SSE 事件类型

`GET /api/discussions/:id/stream` 推送以下事件：

| 事件 | 说明 |
|------|------|
| `panelist_status` | 专家状态变更（发言中 / 等待中 / 已结束） |
| `message_token` | 流式发言 token（打字机效果） |
| `transcript_message` | 完整发言消息 |
| `consensus_update` | 共识点更新（含置信度） |
| `divergence_update` | 分歧点更新（含多方立场） |
| `system_summary` | 系统阶段性总结 |
| `discussion_end` | 讨论结束 |

详细请求/响应格式见 [docs/API.md](docs/API.md)。

## 已完成能力

### 核心功能
- 讨论列表（创建、删除、置顶、状态查看）
- AI 嘉宾阵容生成（1 位主持人 + N 位专家，含姓名、角色、头衔、立场、专属颜色）
- 三步创建流程（输入话题 → 确认嘉宾名单 → 开始讨论）
- 实时圆桌讨论（SSE 流式推送，打字机动画）
- 渐进式发言调度（15 轮，含系统总结与强制收尾）
- 实时共识/分歧追踪（第 4 条消息起每 3 条提炼一次）

### UI/UX
- 深色演播厅主题 + 三层星空背景动画
- 响应式三栏布局（桌面端）+ 底部栏 + Drawer（窄屏）
- 专家专属颜色标识 + 实时状态灯 + 音波动画
- CyberCard 3D 倾斜卡片、GradientButton 渐变按钮等动效组件
- 多种加载动画（BarLoader、OrbitLoader、PulseDot）

### 数据 & 持久化
- SQLite 本地数据库（6 张表，含完整外键与索引）
- 5 条预设种子数据（AI 创造力、远程办公、自动驾驶伦理、教育公平、碳中和）
- API 输出 Zod 验证 + LLM 输出自动重试

### 测试
- 后端单元测试（嘉宾生成、发言调度、共识提炼）
- 后端集成测试（API 端点 + LLM 调用）
- 前端组件测试（18 个文件，Testing Library + jsdom）
- E2E 测试（5 个 spec：主页、创建流程、讨论列表、讨论房间、响应式布局）

## 后续改进方向

### 功能增强
- [ ] 用户手动调整嘉宾阵容（增删、修改属性）
- [ ] 讨论历史回放（逐轮重放发言记录）
- [ ] 导出讨论报告（Transcript + 共识/分歧摘要，PDF/Markdown）
- [ ] 多 LLM 提供商支持（OpenAI、Claude 等，可切换对比）
- [ ] 讨论模板（预设话题 + 嘉宾配置）
- [ ] 搜索与标签过滤讨论列表

### 技术优化
- [ ] 前端 SSE 断线重连与状态恢复
- [ ] 后端请求队列（多讨论并行时的 LLM 调用限流）
- [ ] 数据库迁移到 better-sqlite3（替代 sql.js WASM，提升性能）
- [ ] API 鉴权（用户密钥或简单 Token）
- [ ] 日志与监控（LLM 调用耗时、错误追踪）

### 工程完善
- [ ] CI/CD 流水线（GitHub Actions 自动测试）
- [ ] Docker 容器化部署
- [ ] 性能测试与基准
- [ ] Storybook 组件文档

## 开发文档索引

| 文档 | 说明 |
|------|------|
| [PRD.md](docs/PRD.md) | 产品定位、目标用户、核心功能、技术要求 |
| [ER.md](docs/ER.md) | 数据库 ER 图（mermaid）、完整 SQL Schema |
| [API.md](docs/API.md) | API 端点详情、请求/响应格式、错误码 |
| [要求文档.md](要求文档.md) | 项目交付要求与评分标准 |
| [CLAUDE.md](CLAUDE.md) | Claude Code 项目指引（架构约束、开发范式） |
| [prompts/](prompts/) | 核心 Prompt 记录（SDD/DDD/TDD/E2E 四阶段） |

## License

MIT
