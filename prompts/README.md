# 核心 Prompt 记录

> 记录引导 AI 开发的核心原始 Prompt。每段 Prompt 需标注所属阶段、意图、遇到挑战及修正路径。

---

## 目录

1. [【SDD 阶段】数据建模与 ER 图生成](#1-sdd-阶段数据建模与-er-图生成)
2. [【SDD 阶段】API 契约定义](#2-sdd-阶段api-契约定义)
3. [【DDD 阶段】前端架构设计与组件规划](#3-ddd-阶段前端架构设计与组件规划)
4. [【DDD 阶段】前端工程搭建与组件实现](#4-ddd-阶段前端工程搭建与组件实现)
5. [【TDD 阶段】—— 待记录](#5-tdd-阶段)
6. [【E2E 阶段】—— 待记录](#6-e2e-阶段)

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

> *待记录* — 进入 TDD 阶段后填写

---

## 6. 【E2E 阶段】

> *待记录* — 进入 E2E 阶段后填写
