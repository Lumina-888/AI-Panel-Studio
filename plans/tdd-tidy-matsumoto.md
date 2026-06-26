# TDD 阶段实施计划

**日期**: 2026-06-26
**分支**: v3-final
**状态**: 待确认

---

## Context

AI Panel Studio 已完成 SDD（数据模型 + API 契约）和 DDD（深色演播厅前端）两个阶段。服务端 4 个核心服务（llm、panelist、discussion、consensus）和完整的 REST + SSE 路由已实现并运行，但**零测试覆盖**。前端 16+ 组件、2 个 Zustand store 同样无测试。

TDD 阶段目标：补齐测试基础设施，为核心逻辑建立测试安全网，为后续迭代提供回归保护。

**关键约束**：生产代码已存在且工作正常，不删除重写。按照 TDD 技能指引："Existing code has no tests → add tests for existing code"。针对现有代码写测试验证行为；发现 bug 时严格 RED→GREEN→REFACTOR；新功能严格 TDD。

---

## 实际代码与原始 TDD Spec 的关键差异

| 方面 | 原始 Spec (2026-06-25) | 实际代码 |
|------|----------------------|---------|
| 数据库 | better-sqlite3 | sql.js (WASM) |
| LLMClient | 仅 `chat()` | `chat()` + `streamChat()` |
| decideNextSpeaker 返回值 | `{ panelist_id, type, content }` | `{ panelist_id, type }` (调度与内容生成分离) |
| discussion.ts | decideNextSpeaker 一个函数 | + generateSpeechStream / generateSpeechContent / generateDiscussionSummary / getHostPanelistId |
| Routes/SSE | 标记"后续" | 已完整实现 (800行 routes/discussions.ts) |

测试用例需对齐**实际代码行为**，而非原始 Spec。

---

## 执行顺序

```
Phase 1: 服务端测试基础设施
  → Phase 2: 服务端纯逻辑单元测试 (4个service)
    → Phase 3: 服务端集成测试 (真实API)
      → Phase 4: 前端单元测试 (stores + 组件)
        → Phase 5: E2E 测试 (Playwright)
```

---

## Phase 1: 服务端测试基础设施

### 1.1 安装依赖

在 `server/package.json` 添加：
- `vitest@^4` (devDependency)
- 添加 scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:integration": "vitest run --config vitest.integration.config.ts"`

注意：`server/tsconfig.json` 已有 `"exclude": ["tests"]`，无需修改。

### 1.2 创建 vitest.config.ts

```typescript
// server/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testMatch: ['tests/**/*.test.ts'],
  },
})
```

### 1.3 创建 vitest.integration.config.ts

```typescript
// server/vitest.integration.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testMatch: ['tests/**/*.integration.test.ts'],
    testTimeout: 30000,
  },
})
```

### 1.4 创建 tests/setup.ts — MockLLMClient

MockLLMClient 实现 `LLMClient` 接口（含 `chat` 和 `streamChat`），支持：
- `addResponse(data)` — 压入 JSON 对象
- `addRawResponse(text)` — 压入原始文本
- `addStreamTokens(tokens)` — 压入流式 token 数组
- `chat()` — 消费队列
- `streamChat()` — 异步生成器，逐 token yield

> 复用的接口：`server/src/types/index.ts` 中的 `LLMClient` 已是依赖注入缝，无需修改生产代码。

### 验证

```bash
cd server && pnpm test  # 应输出 "No test files found"
```

---

## Phase 2: 服务端纯逻辑单元测试

所有测试使用 MockLLMClient，不调真实 API。每个 service 的测试文件独立。

### 2.1 panelist.test.ts (~14 cases)

**被测函数**: `generatePanelists(input, llm)` — [server/src/services/panelist.ts:88](server/src/services/panelist.ts#L88)

**内部纯函数**（可单独测试）:
- `extractJson(response)` — markdown代码块提取 / 花括号提取
- `parseResponse(response)` — JSON解析 + Zod校验
- `validatePanelists(panelists, count)` — host数量 / expert数量 / 颜色唯一性

| 分类 | 测试用例 | 验证点 |
|------|---------|--------|
| 输入校验 | 空话题 → ValidationError | `'话题不能为空'` |
| 输入校验 | expert_count=0, -1, 9 → ValidationError | `'专家人数必须在 1-8 之间'` |
| 响应解析 | 正常 JSON → 正确结构 | length, 字段匹配 |
| 响应解析 | markdown代码块包裹 JSON → 正确解析 | 提取逻辑 |
| 响应解析 | 非法 JSON → 重试后仍失败 → LLMParseError | 重试1次 |
| 响应解析 | 缺少必填字段 → LLMParseError | Zod校验 |
| 响应解析 | 非法 role → LLMParseError | enum校验 |
| 响应解析 | 非法 color 格式 → LLMParseError | regex校验 |
| 业务约束 | 0个host → 错误 | `'主持人数量'` |
| 业务约束 | 2个host → 错误 | 同上 |
| 业务约束 | expert数量不匹配 → 错误 | `'专家人数'` |
| 业务约束 | 颜色重复 → 错误 | `'颜色存在重复'` |
| 重试逻辑 | 首次失败+重试成功 → 返回正确结果 | 重试机制 |

### 2.2 discussion.test.ts (~12 cases)

**被测函数**:
- `decideNextSpeaker(ctx, llm)` — [server/src/services/discussion.ts:109](server/src/services/discussion.ts#L109)
- `getHostPanelistId(ctx)` — [server/src/services/discussion.ts:297](server/src/services/discussion.ts#L297)
- `MAX_ROUNDS` — [server/src/services/discussion.ts:6](server/src/services/discussion.ts#L6)

**注意**: `decideNextSpeaker` 实际返回 `{ panelist_id, type }`（无 content），调度与内容生成已分离。

**内部纯函数**:
- `normalizeMessageType(type)` — 合法type原样返回 / 非法降级为 `'statement'`
- `extractJson(response)` — JSON提取
- `checkConsecutiveRule(ctx, id)` — 连续发言规则

| 分类 | 测试用例 | 验证点 |
|------|---------|--------|
| 输入校验 | 空 panelists → ValidationError | `'嘉宾列表不能为空'` |
| 输入校验 | LLM返回不存在的 panelist_id → LLMParseError | ID校验 |
| 类型校验 | 非法 MessageType → 降级为 statement | normalizeMessageType |
| 类型校验 | 合法 type=rebuttal → 保持不变 | 不降级 |
| 连续发言 | 同一嘉宾已连续2次 → 再次选中抛错 | `'连续发言'` |
| 连续发言 | 同一嘉宾仅1次 → 可再次选中 | 不抛错 |
| 开场 | 空消息列表 → 可返回 opening | type 正确 |
| 结束 | LLM返回 closing → 正常返回 | type=closing |
| 解析容错 | markdown包裹JSON → 正确解析 | 提取逻辑 |
| 解析容错 | 非法JSON → LLMParseError | 错误处理 |
| 辅助函数 | getHostPanelistId 找到host → 返回ID | host查找 |
| 辅助函数 | getHostPanelistId 无host → 返回null | 边界条件 |
| 常量 | MAX_ROUNDS === 15 | 值校验 |

### 2.3 consensus.test.ts (~8 cases)

**被测函数**: `extractConsensus(input, llm)` — [server/src/services/consensus.ts:92](server/src/services/consensus.ts#L92)

**内部纯函数**:
- `extractJson(response)` — JSON提取
- `parseResponse(response)` — JSON解析 + Zod校验

| 分类 | 测试用例 | 验证点 |
|------|---------|--------|
| 正常流程 | 从发言提取共识+分歧 | 结构正确 |
| 正常流程 | 无新发现 → 返回空数组 | 空数组 |
| 边界条件 | 空发言列表 → 跳过，返回空 | 不调LLM |
| 边界条件 | confidence 超范围 → Zod失败 → 降级空 | 降级逻辑 |
| 边界条件 | perspectives 少于2个 → 降级空 | min(2)校验 |
| 边界条件 | LLM返回非法JSON → 降级空 | 不回抛 |
| 边界条件 | LLM返回缺字段 → 降级空 | Zod safeParse |
| 正常流程 | 已有共识/分歧传递正确 | 上下文传递 |

### 2.4 llm.test.ts (~2 cases)

**被测函数**: `createLLMClient(apiKey)` — [server/src/services/llm.ts:9](server/src/services/llm.ts#L9)

| 分类 | 测试用例 | 验证点 |
|------|---------|--------|
| 创建 | 返回对象含 chat 和 streamChat 方法 | 接口完整性 |
| 创建 | 空/无效 apiKey 仍可创建（不立即校验） | 延迟校验 |

### 验证

```bash
cd server && pnpm test  # 目标：~36 个纯逻辑测试 PASS
```

---

## Phase 3: 服务端集成测试

使用真实 DeepSeek API，仅验证结构不验证内容。测试用 `describeIf` 包裹，无 API Key 时自动 skip。

### 3.1 panelist.integration.test.ts (~2 cases)

- 给定话题+人数 → 返回合法阵容（1 host + N expert，颜色无重复，必填字段非空）
- 不同话题 → 嘉宾不全部重复

### 3.2 discussion.integration.test.ts (~2 cases)

- 给定上下文 → 返回合法 panelist_id（在嘉宾列表中）+ 合法 type
- 空消息 → 主持人开场（panelist_id 指向 host）

### 3.3 consensus.integration.test.ts (~2 cases)

- 有实质发言 → 返回合法共识/分歧结构
- 空发言列表 → 返回空数组（不调LLM）

### 验证

```bash
cd server && pnpm test:integration  # 需有效 DEEPSEEK_API_KEY，目标：~6 PASS
```

---

## Phase 4: 前端单元测试

### 4.1 安装依赖

在 `client/package.json` 添加：
- `vitest@^4`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `jsdom@^26` (devDependencies)
- 添加 scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

### 4.2 创建 client/vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    testMatch: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
})
```

### 4.3 创建 client/src/test-setup.ts

```typescript
import '@testing-library/jest-dom/vitest'
```

### 4.4 appStore.test.ts (~6 cases)

**被测**: `useAppStore` — [client/src/stores/appStore.ts](client/src/stores/appStore.ts)

| 测试用例 | 验证点 |
|---------|--------|
| 初始状态正确 | discussions=[], loading=false, activeDiscussionId=null, createModalOpen=false |
| fetchDiscussions 成功 → 填充列表 | discussions 更新, loading 状态变化 |
| fetchDiscussions 失败 → 列表保持空 | 错误处理 |
| setActiveDiscussion → 更新 activeDiscussionId | ID 正确 |
| openCreateModal / closeCreateModal → 切换 createModalOpen | boolean 切换 |
| deleteDiscussion → 从列表移除 | 过滤逻辑 |

使用 `vi.stubGlobal('fetch', ...)` mock API 调用。

### 4.5 discussionStore.test.ts (~10 cases)

**被测**: `useDiscussionStore` — [client/src/stores/discussionStore.ts](client/src/stores/discussionStore.ts)

| 测试用例 | 验证点 |
|---------|--------|
| 初始状态 | discussion=null, panelists=[], messages=[], consensusPoints=[], divergencePoints=[] |
| fetchDiscussion → 填充所有字段 | discussion/panelists/messages/consensus/divergence 正确赋值 |
| addMessage → 添加到 messages | 去重、seq 排序 |
| appendMessageToken 新seq → 创建占位符 | `streaming-{seq}` ID |
| appendMessageToken 已有消息 → 追加 token | content 拼接 |
| updatePanelistStatus → 更新对应 panelist | status + focus 变更 |
| upsertConsensus 新点 → 追加 | 数组新增 |
| upsertConsensus 已有ID → 更新 | 内容替换 |
| upsertDivergence 新点 → 追加 | 数组新增 |
| endDiscussion → 设置状态为ended + 断开SSE | 状态变更 + eventSource.close |
| disconnectSSE → 关闭 EventSource | eventSource = null |
| reset → 恢复到初始状态 | 所有字段重置 |

使用自定义 `MockEventSource` 类模拟 SSE 连接。

### 4.6 组件测试 (~8 cases，关键组件优先)

| 组件 | 测试用例 | 验证点 |
|------|---------|--------|
| PulseDot | active/waiting/ended 三种状态 | className + aria-label |
| PulseDot | 自定义 className 合并 | props 透传 |
| LoadingIndicator | visible=true → 渲染 | DOM 存在 |
| LoadingIndicator | visible=false → 不渲染 | DOM 不存在 |
| DiscussionList | 加载中 → 显示 LoadingIndicator | loading 状态 |
| DiscussionList | 空列表 → 显示空状态 | 条件渲染 |
| DiscussionList | 有讨论 → 渲染列表项 | 数据映射 |
| TranscriptView | 空消息 → 显示"等待主持人开场" | 空状态文案 |

### 验证

```bash
cd client && pnpm test  # 目标：~24 个前端测试 PASS
```

---

## Phase 5: E2E 测试 (Playwright)

### 5.1 安装与配置

在项目根目录创建 `e2e/` 目录：
- `pnpm add -D @playwright/test@^1.54` (在根目录或 e2e 子目录)
- 创建 `e2e/playwright.config.ts`（webServer 启动 server:3001 + client:5173）
- 创建 `e2e/fixtures/` 存放测试数据

### 5.2 关键用户流程测试 (~8 cases)

| 测试 | 流程 | 验证点 |
|------|------|--------|
| 首页加载 | 访问 `/` → 显示首页 | StarfieldBackground、首页UI元素 |
| 导航到演播厅 | 点击进入 → `/discussions` | StudioLayout 三栏渲染 |
| 讨论列表显示 | 在演播厅页面 | 种子讨论渲染、状态标签正确 |
| 创建讨论-步骤1 | 打开创建模态框 | 话题输入、人数滑块、生成按钮 |
| 讨论详情页 | 点击讨论 → `/discussions/:id` | DiscussionRoom 渲染、嘉宾侧边栏 |
| 开始讨论 | 确认嘉宾 → SSE连接 → 发言流 | 消息出现、嘉宾状态更新 |
| 共识面板交互 | 讨论进行中 | 共识/分歧 tab 切换、内容渲染 |
| 移动端抽屉 | 窄视口 → 抽屉按钮出现 | 响应式布局 |

### 验证

```bash
cd e2e && npx playwright test  # 目标：~8 E2E PASS
```

---

## 文件变更清单

### 新建文件

```
server/
├── vitest.config.ts
├── vitest.integration.config.ts
└── tests/
    ├── setup.ts                          # MockLLMClient
    └── services/
        ├── panelist.test.ts
        ├── panelist.integration.test.ts
        ├── discussion.test.ts
        ├── discussion.integration.test.ts
        ├── consensus.test.ts
        ├── consensus.integration.test.ts
        └── llm.test.ts

client/
├── vitest.config.ts
└── src/
    ├── test-setup.ts
    ├── stores/
    │   ├── appStore.test.ts
    │   └── discussionStore.test.ts
    └── components/
        ├── PulseDot.test.tsx
        ├── LoadingIndicator.test.tsx
        ├── DiscussionList.test.tsx
        └── TranscriptView.test.tsx

e2e/
├── playwright.config.ts
├── fixtures/
│   └── test-data.ts
└── tests/
    ├── home.spec.ts
    ├── discussion-list.spec.ts
    ├── create-discussion.spec.ts
    └── discussion-room.spec.ts
```

### 修改文件

```
server/package.json          # +vitest, +test scripts
client/package.json          # +vitest, +@testing-library/react, +jsdom, +test scripts
```

### 不修改的文件

- 所有 `server/src/services/*.ts` — 已有 `LLMClient` 接口作为 DI 缝，无需改动
- 所有 `server/src/types/*.ts` — 类型已完备
- 所有前端组件 — 仅通过 props/store 测试，不改源码

---

## 验证策略

每次 Phase 完成后运行对应测试套件：

| Phase | 命令 | 预期 |
|-------|------|------|
| 1 | `cd server && pnpm test` | "No test files found" (vitest 正常) |
| 2 | `cd server && pnpm test` | ~36 PASS (纯逻辑) |
| 3 | `cd server && pnpm test:integration` | ~6 PASS (需API Key) |
| 4 | `cd client && pnpm test` | ~24 PASS (store + 组件) |
| 5 | `cd e2e && npx playwright test` | ~8 PASS (全栈) |

---

## 提交计划

```
test: add server test infrastructure with vitest and MockLLMClient
test: add panelist service unit tests
test: add discussion service unit tests
test: add consensus service unit tests
test: add llm service unit tests
test: add server integration tests (panelist/discussion/consensus)
test: add client test infrastructure with vitest and testing-library
test: add appStore and discussionStore unit tests
test: add component unit tests (PulseDot, LoadingIndicator, DiscussionList, TranscriptView)
test: add Playwright E2E tests for critical user flows
```
