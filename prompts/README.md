# 核心 Prompt 记录

> 记录引导 AI 开发的核心原始 Prompt。每段 Prompt 需标注所属阶段、意图、遇到挑战及修正路径。

---

## 目录

1. [【SDD 阶段】数据建模与 ER 图生成](#1-sdd-阶段数据建模与-er-图生成)
2. [【SDD 阶段】API 契约定义](#2-sdd-阶段api-契约定义)
3. [【DDD 阶段】前端架构设计与组件规划](#3-ddd-阶段前端架构设计与组件规划)
4. [【DDD 阶段】前端工程搭建与组件实现](#4-ddd-阶段前端工程搭建与组件实现)
5. [【TDD 阶段】后端 TDD 工程搭建 + 核心服务实现](#51-后端-tdd-工程搭建--核心服务实现)
6. [【TDD 阶段】讨论删除/置顶 + 流式输出](#52-讨论删除置顶--流式输出)
7. [【TDD 阶段】全站视觉重设计](#53-全站视觉重设计)
8. [【E2E 阶段】Playwright E2E 测试框架搭建](#61-playwright-e2e-测试框架搭建)

---

## 1. 【SDD 阶段】数据建模与 ER 图生成

### Prompt

```
你现在扮演一名资深后端架构师。这是一个AI圆桌讨论Web应用"AI Panel Studio"，
用户输入讨论话题和专家人数，系统调用大模型生成主持人+专家阵容，然后驱动实时圆桌讨论。

请根据以下业务需求，完成数据建模：

核心业务流程：
1. 用户创建讨论 → 系统生成嘉宾名单（1名主持人 + N名专家）
2. 用户确认名单 → 讨论开始，AI驱动发言
3. 讨论过程中实时追踪：Transcript、共识、分歧
4. 专家有小窗显示状态（standby/preparing/speaking）和当前关注点
5. 讨论结束后由主持人总结

请输出：
1. 所有实体定义（字段名、类型、约束、说明）
2. 实体之间的 ER 关系图（mermaid 格式）
3. 完整的 SQLite 建表 SQL（含索引）
4. 关键设计决策说明

要求：
- 数据库使用 SQLite
- 所有主键使用 UUID 字符串
- 支持多讨论并行，数据完全隔离
- 状态字段使用 CHECK 约束
```

### 意图
定义整个项目的核心数据骨架，确保 Discussion / Panelist / Message / ConsensusPoint / DivergencePoint / PanelistStatusLog 六张表的关系清晰、字段完整。

### 挑战与修正
- **挑战**：最初遗漏了 Panelist 状态变化的历史追踪需求，后根据用户反馈补充了 `PanelistStatusLog` 表
- **修正**：在 ER 图中补充了 Panelist → PanelistStatusLog 的一对多关系，并在建表 SQL 中添加了对应索引

---

## 2. 【SDD 阶段】API 契约定义

### Prompt

```
基于已确认的数据模型（Discussion、Panelist、Message、ConsensusPoint、DivergencePoint、PanelistStatusLog），
请定义完整的 REST + SSE API 契约。

业务场景：
1. 用户浏览讨论列表 → 加入或创建新讨论
2. 创建讨论时 POST 话题+人数 → 后端调用 LLM 生成嘉宾 → 返回嘉宾名单给用户确认
3. 用户确认名单后 POST → 讨论启动，AI 驱动发言
4. 前端通过 SSE 订阅实时事件流（嘉宾状态变化、新发言、共识/分歧更新、讨论结束）
5. 支持分页获取历史 Transcript

输出：
1. 每个端点的 Method、Path、Request/Response 示例
2. SSE 事件流协议（事件类型、payload 结构、触发时机）
3. 错误码定义
4. API 设计原则说明

要求：
- API Key 绝对不能暴露在请求/响应中
- SSE 端点每个讨论独立
- 分页使用游标机制
```

### 意图
在编码前精确锁定前后端交互协议，避免后期因接口不一致导致大量返工。

### 挑战与修正
- **挑战**：SSE 事件粒度如何平衡——太细导致前端渲染压力大，太粗丢失实时感
- **修正**：将事件收敛为 5 种核心类型（panelist_status / transcript_message / consensus_update / divergence_update / discussion_end），共识/分歧仅在内容变化时推送而非定时轮询

---

## 3. 【DDD 阶段】前端架构设计与组件规划

### Prompt

```
你现在扮演一名资深 UI/UX 架构师，为"AI Panel Studio"设计前端架构。

产品定位：AI 圆桌讨论演播厅，用户发起话题后由 AI 驱动主持人和专家进行实时讨论。

请基于以下需求完成前端设计：
1. 组件树 —— 从 App 根节点到每个叶子组件的层级关系
2. 响应式三栏布局方案 —— 超宽屏 (>1400px) / 普通桌面 (960-1400px) / 窄屏 (<960px)
3. 状态管理方案 —— Zustand stores，多讨论并行隔离
4. 视觉风格 —— 深色演播厅 + 科技感（辉光边框、玻璃质感、网格点阵背景、shimmer 效果）
5. SSE 实时事件流集成方式

关键交互：
- 窄屏用抽屉式（左抽屉:讨论列表，右抽屉:专家面板），主舞台始终可见
- 每个讨论独立 SSE 连接，离开讨论时断开
- 专家状态灯（绿=发言中/黄=准备中/灰=待机）+ 脉动光环动画
- 新发言淡入动画，Transcript 自动滚到底部

输出：
1. ASCII 组件树
2. 宽屏/窄屏布局 ASCII 图示
3. Zustand store 结构设计
4. CSS 设计 Token（颜色、动画、字体）
```

### 意图
在写任何一行组件代码之前，完整定义前端的组件架构、响应式策略和视觉语言。要求先出设计再编码，防止随意堆砌组件。

### 挑战与修正
- **挑战**：窄屏三栏布局中，主舞台、讨论列表、专家面板如何协调展示才能在手机上可用
- **修正**：采用左右抽屉式（从用户反馈中确认），主舞台始终可见，讨论列表和专家面板作为滑入式抽屉，半透明遮罩，不遮挡主舞台

---

## 4. 【DDD 阶段】前端工程搭建与组件实现

### Prompt

```
基于已确认的前端设计（组件树、三栏抽屉布局、科技感演播厅视觉），
请在 client/ 目录下完成前端工程搭建。

技术栈：
- Vite 8 + React 19 + TypeScript 5.8
- Tailwind CSS v4 (通过 @tailwindcss/vite 插件)
- Zustand v5 状态管理
- react-router-dom v7 路由

当前项目环境（已确认本地安装）：
- Node.js v24.15.0
- pnpm 11.9.0

步骤：
1. pnpm create vite 脚手架
2. 安装依赖：react react-dom zustand react-router-dom tailwindcss @tailwindcss/vite
3. 配置 vite.config.ts 集成 Tailwind 插件 + API 代理到 localhost:3001
4. 创建 src/types/index.ts 统一类型定义
5. 创建 Zustand stores: appStore (全局讨论列表) + discussionStore (单讨论实时数据 + SSE)
6. 创建核心组件：
   - AppLayout: 三栏布局 + 窄屏抽屉触发栏
   - Drawer: 通用滑入抽屉组件
   - DiscussionList: 讨论列表（状态筛选、选中高亮）
   - CreateDiscussionModal: 两步创建（输入话题→确认嘉宾）
   - DiscussionRoom: 讨论主舞台（顶栏 + Transcript + 共识/分歧）
   - TranscriptView: 实时发言流（自动滚底 + 淡入动画）
   - ConsensusDivergencePanel: 共识/分歧 Tab 切换面板
   - PanelistSidebar: 专家状态面板（头像 + 状态灯 + 关注点）
7. 全局 CSS: 科技感主题 Token + 动画定义 + 滚动条美化

要求：
- TypeScript strict 模式，noUnusedLocals/Parameters
- 所有 UI 文本使用中文
- 颜色方案匹配已确认的设计 Token
- discussionStore 实现完整的 SSE 事件处理（5种事件类型）
```

### 意图
一次性搭建完整的前端组件体系，确保所有组件在同一个视觉语言和架构约束下运行，避免拼凑感。

### 挑战与修正
- **挑战**：Vite 8 脚手架生成的是非 React 模板（纯 HTML + TS），需要手动配置 React 的 main.tsx 入口和 tsconfig.json 的 jsx 选项
- **修正**：删除了 Vite 模板自带的 counter.ts 和 main.ts，新建 main.tsx 作为 React 入口，在 tsconfig.json 中补充 `"jsx": "react-jsx"`
- **挑战**：Tailwind CSS v4 使用 CSS-first 配置（@theme 指令），与 v3 的 tailwind.config.js 完全不同
- **修正**：在 style.css 中使用 `@import 'tailwindcss'` 和 `@theme` 指令定义设计 Token，通过 `@tailwindcss/vite` 插件集成

---

## 5. 【TDD 阶段】

### 5.1 后端 TDD 工程搭建 + 核心服务实现

#### Prompt

```
你现在扮演一名资深后端工程师，以 TDD 方式搭建 server/ 后端工程。

技术栈：Node.js 24 / TypeScript 5.8 / Vitest 4 / Zod 3 / OpenAI SDK 4 / Express 5

核心模块（三个）：
1. 嘉宾生成 (services/panelist.ts) — 根据话题+人数调用 LLM 生成 1 host + N expert
2. 发言调度 (services/discussion.ts) — 根据讨论上下文决定下一个发言人和类型
3. 共识提炼 (services/consensus.ts) — 从发言中提取共识点(含置信度)和分歧点

TDD 铁律：先写失败测试 → 验证 RED → 最小实现 → 验证 GREEN → 提交。

架构约束：
- LLMClient 接口通过依赖注入，测试使用 MockLLMClient
- 纯逻辑测试不调真实 API，集成测试调真实 DeepSeek API
- 三个 service 不直接操作数据库
- 集成测试只验结构不验内容

输出：
1. server/ 工程脚手架（package.json + tsconfig + vitest.config）
2. 基础类型定义（types/index.ts）含 LLMClient 接口
3. 错误工具（utils/errors.ts）
4. 数据库初始化薄封装（db/index.ts）
5. LLM 适配器（services/llm.ts）
6. 三个核心 service 的测试文件 × 3 + 实现文件 × 3
7. 集成测试（调真实 API，无 Key 时自动 skip）
```

#### 意图
以严格 TDD 流程确保三项核心逻辑（嘉宾生成、发言调度、共识提炼）的正确性，通过 MockLLMClient 依赖注入实现纯逻辑与集成测试分离。

#### 挑战与修正
- **挑战**：panelist 生成测试用例覆盖了解析容错（markdown 包裹 JSON、非法 JSON、缺失字段、非法 role/color、颜色重复、host 数量校验），共 14 个测试用例，实现时需精确匹配 Zod schema + 业务校验逻辑 + 1 次重试策略
- **修正**：Zod schema 的 discriminator 写法在复杂对象中不适用，改为手动校验 host 数量 + 颜色唯一性；extractJson 函数通过正则提取 JSON 块，兼容 LLM 常见的 markdown 代码块包裹行为
- **挑战**：consensus 提炼因实时场景对延迟敏感，决定只对 panelist 实施 1 次重试，discussion 和 consensus 不重试
- **修正**：consensus 解析失败采用降级处理（返回空数组），不打断讨论流程

---

### 5.2 讨论删除/置顶 + 流式输出

#### Prompt

```
基于已完成的三项核心 service，实现以下后端功能：

1. 数据库新增 pinned_at 列，支持讨论置顶（允许多条，按 pinned_at 倒序）
2. 新增 DELETE /api/discussions/:id 和 PATCH /api/discussions/:id/pin 端点
3. 发言拆分为两步（调度决策 + 流式内容生成）：
   - decideNextSpeaker 只返回 { panelist_id, type }，不再包含 content
   - 新增 generateSpeechStream (AsyncGenerator) 和 generateSpeechContent
4. SSE 新增 message_token 事件类型，逐 token 推送发言内容
5. 前端 discussionStore 新增 appendMessageToken 处理流式追加
6. 前端 DiscussionList 新增置顶/删除按钮和确认弹窗
```

#### 意图
在核心逻辑完成后，将讨论管理（删除/置顶）和流式输出体验补全，为 E2E 测试提供完整的用户流程。

#### 挑战与修正
- **挑战**：拆分 decideNextSpeaker 后需修改 4 处调用（confirm / start / next-step / SSE stream），保持调度 prompt 与内容生成 prompt 独立且上下文传递正确
- **修正**：generateSpeechStream 通过独立的 speech system prompt（第一人称、口语化、1-2 句）和包含发言人 name/title/stance 的 user prompt 生成发言，与调度 prompt 完全解耦
- **挑战**：SSE 流式推送中 token 乱序问题——message_token 可能在 transcript_message 之前到达
- **修正**：前端 appendMessageToken 先通过 seq 查找占位消息追加 token，addMessage 在收到完整 transcript_message 后替换同级占位行

---

### 5.3 全站视觉重设计

#### Prompt

```
基于现有代码库，按照全站视觉重设计规范完成以下工作。

双主题设计：
- 主页 (/)：极简黑白调，StarfieldBackground mono 主题
- 演播厅 (/discussions, /discussion/:id)：深蓝科技感，黑蓝玻璃面板

新建/重组：
1. 路由架构：/ → HomePage, /discussions → StudioLayout, /discussion/:id → DiscussionRoom
2. 新组件：PulseDot 三态脉冲圆点, HomeDiscussionPreview, StudioDiscussionList
3. 增强组件：StarButton 渐变滑动, SlideButton 渐变, BarLoader 音波条, CyberCard/ExpandCard
4. 重设计：TranscriptView 横线分隔去卡片, ConsensusDivergencePanel 拖拽调整高度, PanelistSidebar
5. 三级弹窗统一框架：glass-panel + SlideButton + OrbitLoader

硬性约束：
- 所有功能、API、状态管理逻辑不变
- 纯 JSX/CSS 重构，Tailwind v4 内联
- 所有 UI 文本使用中文
```

#### 意图
在保持所有后端逻辑和状态管理不变的前提下，通过纯 UI 重构提升设计品质，实现"演播厅"视觉体验。

#### 挑战与修正
- **挑战**：中间发现组件过度碎片化，部分组件只有一两行 JSX，过度抽象
- **修正**：合并了一些薄组件，保持组件数量合理，遵循"够用"原则
- **挑战**：Tailwind v4 的 @theme 变量在组件中无法直接引用，需要内联或者通过 CSS 变量桥接
- **修正**：在 style.css 中通过 @layer base 定义 CSS 变量，组件中通过 Tailwind 类名引用

---

## 6. 【E2E 阶段】

### 6.1 Playwright E2E 测试框架搭建

#### Prompt

```
为 client/ 搭建 Playwright E2E 测试框架。

要求：
1. Mock API 服务器：在 e2e/mock-server/ 创建 Express 服务，监听 3001 端口
   - 覆盖所有 REST 端点（CRUD discussions + start + next-step + confirm）
   - 模拟 SSE 事件流推送
   - 使用与真实 API 一致的响应结构
2. 测试数据工厂：e2e/fixtures/mock-data.ts 提供预设讨论、嘉宾、消息数据
3. 测试用例覆盖：
   - homepage.spec.ts：主页渲染、讨论列表预览、发起新讨论 CTA
   - create-discussion.spec.ts：创建弹窗 → 输入话题 → 生成嘉宾 → 确认流程
   - discussion-list.spec.ts：演播厅列表、置顶/删除操作
   - discussion-room.spec.ts：讨论室渲染、Transcript 消息展示、共识/分歧面板
   - responsive.spec.ts：桌面端/平板/手机三档响应式布局验证
4. Playwright 配置：chromium-desktop，CI 模式下 retry: 2
5. Vitest 配置排除 e2e/ 目录，避免 Playwright spec 被 Vitest 误捕获
```

#### 意图
建立完整的 E2E 测试基础设施，通过 Mock API 服务器隔离后端依赖，确保前端交互流程在无真实 LLM API 的情况下也能完整验证。

#### 挑战与修正
- **挑战**：Playwright 和 Vitest 都匹配 `*.spec.ts` 文件，导致 Vitest 运行时误捕获 Playwright 测试文件报 5 个 FAIL
- **修正**：在 vitest.config.ts 中添加 `include: ['src/**/*.test.{ts,tsx}']` 和 `exclude: ['e2e/**']`，明确区分 Vitest（单元/组件测试）和 Playwright（E2E）的测试文件范围
- **挑战**：Mock SSE 服务器需要在测试期间持续推送事件，但又不能无限运行
- **修正**：Mock 服务器通过预设的事件序列（eventQueue）模拟 SSE 流，每个讨论独立队列，讨论结束后自动停止推送
