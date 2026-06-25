# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**AI Panel Studio** — AI 圆桌讨论本地 Web 应用。用户输入话题，系统调用 DeepSeek V4 Pro 动态生成主持人+专家群像，驱动实时圆桌讨论，包含实时共识/分歧追踪、专家状态小窗、现场 Transcript。

## 开发范式与阶段顺序

本项目严格遵循三阶段开发范式，**不得跳过或混合阶段**：

### 阶段 1: SDD（契约/模型驱动）
- 定义数据模型（Discussion、Panelist、Message、ConsensusPoint、DivergencePoint）
- 定义 API 契约（REST + SSE 端点）
- 输出：ER 图（mermaid）、API 文档、数据库初始化脚本
- 此阶段**不写任何 UI 代码**

### 阶段 2: DDD（设计驱动）
- 以"演播厅"视觉风格驱动前端组件设计
- 响应式三栏布局：讨论列表 | 主舞台（Transcript + 共识/分歧）| 专家状态面板
- 深色演播厅主题、专家专属颜色标识、实时打字动画
- 输出：UI 组件树、状态管理方案、页面布局

### 阶段 3: TDD（测试驱动）
- 针对核心逻辑编写测试 → 实现 → 重构
- 核心逻辑包括：嘉宾生成、发言调度、共识/分歧提炼
- 必须包含 E2E 测试（Playwright 或 Cypress）

## 技术栈

| 层 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 运行时 | Node.js | 24.15.0 (本地) | |
| 包管理 | pnpm | 11.9.0 (本地) | |
| 前端框架 | React + TypeScript + Vite | React 19 / TS 5.8 / Vite 7 | SPA，响应式布局 |
| 样式 | Tailwind CSS | v4 | 深色科技感演播厅主题 |
| 状态管理 | Zustand | v5 | 轻量，支持多讨论并行隔离 |
| 后端 | Node.js + Express + TypeScript | Express 5 / TS 5.8 | REST + SSE |
| 数据库 | SQLite（better-sqlite3） | v11 | 本地文件存储，零配置 |
| 实时通信 | SSE（Server-Sent Events） | 原生 | 单向推送讨论事件流 |
| LLM | DeepSeek V4 Pro API | OpenAI 兼容 | `baseURL: https://api.deepseek.com/v1` |
| 测试 | Vitest + Playwright | Vitest 4 / Playwright 1.54 | 单元集成 + E2E |

## 项目结构

```
ai-panel-studio/
├── client/                    # 前端 React 应用
│   ├── src/
│   │   ├── components/        # UI 组件
│   │   │   ├── layout/        # 布局组件（三栏）
│   │   │   ├── discussion/    # 讨论相关组件
│   │   │   ├── panelist/      # 专家状态小窗
│   │   │   ├── transcript/    # 实时 Transcript
│   │   │   └── consensus/     # 共识/分歧面板
│   │   ├── stores/            # Zustand stores
│   │   ├── hooks/             # 自定义 hooks（SSE 连接等）
│   │   ├── types/             # 前端类型定义
│   │   └── utils/
│   └── index.html
├── server/                    # 后端 Express 应用
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 业务逻辑
│   │   │   ├── llm.ts         # DeepSeek API 调用
│   │   │   ├── panelist.ts    # 嘉宾生成与调度
│   │   │   ├── discussion.ts  # 讨论编排
│   │   │   └── consensus.ts   # 共识/分歧提炼
│   │   ├── models/            # 数据模型与 DB 操作
│   │   ├── sse/               # SSE 连接管理
│   │   ├── types/             # 后端类型定义
│   │   └── index.ts           # 入口
│   ├── data/                  # SQLite 数据库文件（Git 忽略）
│   ├── migrations/            # SQLite 初始化脚本
│   └── seeds/                 # 样例数据（≥5 条）
├── e2e/                       # Playwright E2E 测试
├── prompts/                   # 核心 Prompt 记录（≥5 段）
├── docs/                      # 开发文档
│   ├── PRD.md
│   ├── ER.md                  # ER 图（mermaid）
│   ├── API.md                 # API 文档
│   └── architecture.md
└── README.md
```

## 关键架构约束

### SSE 事件流协议
- 每个讨论拥有独立的 SSE 端点：`GET /api/discussions/:id/stream`
- 事件类型：`panelist_status`、`transcript_message`、`consensus_update`、`divergence_update`、`discussion_end`
- 前端通过 `EventSource` 连接，每个讨论一个独立连接

### 多讨论并行隔离
- 每个讨论在前端有独立的 Zustand store 实例（通过 React context 隔离）
- 后端每个讨论维护独立的事件流和数据库记录
- 不同讨论的 LLM 调用完全独立

### LLM 调用约束
- API Key **仅在后端**通过环境变量 `DEEPSEEK_API_KEY` 读取
- 前端不得有任何 LLM 调用的痕迹
- 使用 OpenAI 兼容格式调用 DeepSeek：`baseURL: https://api.deepseek.com/v1`

### 专家发言调度规则
- 主持人控制开场、追问、串场、总结
- 专家自主决定发言（非轮询），每人 1-2 句
- 允许抢答、补充、反驳
- 前端只展示发言内容和公开摘要，不展示内部推理

## 环境变量

```bash
# server/.env（不得提交到 Git）
DEEPSEEK_API_KEY=sk-xxx
PORT=3001
DATABASE_PATH=./server/data/panel.db
```


## 注意事项

- SQLite 数据库文件位于 `server/data/` 目录，已在 `.gitignore` 中排除
- 
## 项目特定指南

- 使用 TypeScript 严格模式
- 所有 API 端点必须有测试
- 遵循 `src/utils/errors.ts` 中现有的错误处理模式

## 开发流程规则

1. **逐阶段推进**：完成 SDD 全部交付物 → 进入 DDD → 完成 DDD 全部交付物 → 进入 TDD，不得交叉
2. **Git 提交层级清晰**：commit message 前缀 `docs:` → `schema:` → `ui:` → `test:` → `feat:` → `fix:`
3. **禁止一键生成**：每个功能模块必须拆解，通过独立 Prompt 引导 AI 逐步实现
4. **所有 Prompt 必须记录**：保存到 `prompts/` 目录，标注阶段、意图和修正过程
5. **中文 UI**：所有面向用户的界面文本使用中文
