# TDD 后端工程设计

**日期**: 2026-06-25
**阶段**: TDD（测试驱动开发）
**状态**: 已确认

---

## 1. 范围

TDD 阶段聚焦后端三项核心逻辑，采用"核心优先+薄路由"策略（方案 C）：

- **本期**：核心逻辑模块（纯函数 + LLM 调用）+ 测试
- **后续**：Express 路由、SSE 推送、DB 操作层

### 核心模块

| 模块 | 文件 | 职责 |
|---|---|---|
| LLM 适配器 | `server/src/services/llm.ts` | DeepSeek API 薄封装，暴露 `LLMClient` 接口 |
| 嘉宾生成 | `server/src/services/panelist.ts` | 根据话题+人数生成 1 host + N expert |
| 发言调度 | `server/src/services/discussion.ts` | 决定下一个发言人、发言类型、发言内容 |
| 共识提炼 | `server/src/services/consensus.ts` | 从发言中提取共识/分歧点 |

---

## 2. 工程结构

```
server/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env                      # DEEPSEEK_API_KEY（不提交）
├── src/
│   ├── types/
│   │   └── index.ts          # 后端类型（含 LLMClient 接口）
│   ├── services/
│   │   ├── llm.ts             # DeepSeek API 适配器
│   │   ├── panelist.ts        # 嘉宾生成
│   │   ├── discussion.ts      # 发言调度
│   │   └── consensus.ts       # 共识提炼
│   ├── utils/
│   │   └── errors.ts          # 错误类型
│   └── db/
│       └── index.ts            # better-sqlite3 初始化（薄封装）
├── tests/
│   ├── services/
│   │   ├── panelist.test.ts
│   │   ├── panelist.integration.test.ts
│   │   ├── discussion.test.ts
│   │   ├── discussion.integration.test.ts
│   │   ├── consensus.test.ts
│   │   └── consensus.integration.test.ts
│   └── setup.ts               # 测试公共配置
├── migrations/
│   └── init.sql               # 已存在
├── seeds/
│   └── seed.sql               # 已存在
└── data/
    └── .gitkeep
```

### 依赖

```json
{
  "dependencies": {
    "express": "^5",
    "better-sqlite3": "^11",
    "openai": "^4",
    "uuid": "^11",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5.8",
    "vitest": "^4",
    "@types/better-sqlite3": "^11",
    "@types/express": "^5",
    "@types/uuid": "^10",
    "tsx": "^4"
  }
}
```

---

## 3. 核心接口设计

### 3.1 `LLMClient` 接口（依赖注入）

```typescript
export interface LLMClient {
  chat(messages: { role: string; content: string }[]): Promise<string>
}
```

`services/llm.ts` 的 `createLLMClient(apiKey)` 返回此接口，测试可注入 mock。

### 3.2 `generatePanelists`

```typescript
export async function generatePanelists(
  input: GeneratePanelistsInput,
  llm: LLMClient
): Promise<GeneratedPanelist[]>
```

- 输入：`{ topic: string, expert_count: number }`
- 输出：`[{ name, role, title, stance, color }]`
- 系统 prompt 指定角色生成器，user prompt 含话题+人数
- 解析失败重试 1 次；仍失败抛 `LLM_PARSE_ERROR`
- 校验：恰好 1 host、颜色无重复

### 3.3 `decideNextSpeaker`

```typescript
export async function decideNextSpeaker(
  ctx: SchedulingContext,
  llm: LLMClient
): Promise<{ panelist_id: string; type: MessageType; content: string }>
```

- 输入：话题 + 嘉宾列表（含状态）+ 最近 N 条发言
- 输出：谁发言（panelist_id，需匹配嘉宾列表中的 id）、类型、内容
- 调用方负责：写入 DB、推送 SSE、更新嘉宾状态

### 3.4 `extractConsensus`

```typescript
export async function extractConsensus(
  input: ConsensusInput,
  llm: LLMClient
): Promise<{
  consensus: { content: string; confidence: number }[]
  divergence: { content: string; perspectives: string[] }[]
}>
```

- 输入：话题 + 最近发言 + 现有共识/分歧
- 输出：新发现的共识（含置信度 0-1）、新分歧（至少 2 方立场）
- 空发言列表 → 跳过，返回空数组
- 调用方负责合并/更新现有记录

---

## 4. 测试策略

### 测试分层

| 层级 | 文件命名 | 依赖 | 速度 | 运行频率 |
|---|---|---|---|---|
| 纯逻辑测试 | `*.test.ts` | 无（纯函数） | <1s | 每次保存 |
| 集成测试 | `*.integration.test.ts` | 真实 DeepSeek API | 秒级 | 手动/CI |

### 纯逻辑测试项

**panelist.test.ts:**
- 输入校验：空话题 → `VALIDATION_ERROR`
- 输入校验：expert_count < 1 或 > 8 → 错误
- 响应解析：正常 JSON → 正确结构
- 响应解析：非法 JSON → `LLM_PARSE_ERROR`
- 响应解析：缺必填字段 → 校验错误
- 响应解析：非 host/expert 角色 → 校验错误
- 业务约束：恰好 1 host
- 业务约束：颜色无重复

**discussion.test.ts:**
- 输入校验：panelist_id 不在嘉宾列表 → 错误
- 输入校验：空嘉宾列表 → 错误
- 发言类型校验：非法 MessageType → 降级为 statement
- 同一嘉宾不能连续发言超过 2 次
- 讨论开场时主持人第一个发言（type=opening）
- 结束条件：LLM 返回结束 → closing message

**consensus.test.ts:**
- 正常提取共识
- 已有共识 confidence 调整
- confidence 始终在 0-1 范围
- 检测到对立观点 → 生成分歧
- 无分歧时返回空数组
- 空发言列表 → 跳过
- 非法 JSON → 保留现有结果不变

### 集成测试项（调真实 API）

- 嘉宾生成：给定话题 → 结构合法、1 host + N expert、必填字段非空
- 发言调度：给定上下文 → 返回合法 panelist_id + type + 非空 content
- 共识提炼：给定发言列表 → 返回合法共识/分歧结构

**集成测试只验结构不验内容**，超时 30s。

### Mock 策略

```typescript
class MockLLMClient implements LLMClient {
  private responses: string[] = []
  addResponse(json: unknown) { this.responses.push(JSON.stringify(json)) }
  async chat(): Promise<string> { return this.responses.shift() ?? '{}' }
}
```

- Mock 的是 `LLMClient` 接口，不 mock OpenAI SDK
- 纯逻辑测试全部使用 mock，不调真实 API

### vitest 配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testMatch: ['tests/**/*.test.ts'],  // 默认只跑纯逻辑
  },
})
// 集成测试通过 vitest --testMatch 'tests/**/*.integration.test.ts' 单独运行
```

---

## 5. 关键设计决策

| 决策 | 选择 | 原因 |
|---|---|---|
| 项目组织 | 独立 `server/package.json` | client 已是独立项目，不加 workspace 重构 |
| 核心 vs 路由 | 先核心逻辑，路由后续 | 符合 CLAUDE.md "聚焦嘉宾生成、发言调度、共识提炼" |
| Prompt 模板 | 内嵌在 service 文件中 | 少于 200 行不单独拆文件，保持简单 |
| Zod schema | 每个 service 内部定义 | 避免共享耦合 |
| 重试策略 | 仅 panelist 重试 1 次 | 发言调度和共识提炼在实时场景等不起 |
| 无状态函数 | 三个 service 不直接操作 DB | 输入参数 → LLM → 返回结果，调用方负责持久化 |
| DB 层 | `db/index.ts` 薄封装 | better-sqlite3 同步 API，~30 行 |
| 类型对齐 | snake_case DB 行 + 业务层接口分离 | 不直接暴露 DB 行给 service |
| LLM 调用 | 使用真实 DeepSeek API | 集成测试只验结构不验内容 |

---

## 6. TDD 执行顺序

按依赖关系排序：

```
1. server 工程搭建（package.json + tsconfig + vitest.config + .env）
2. types/index.ts + utils/errors.ts + db/index.ts
3. services/llm.ts + 测试
4. services/panelist.ts（纯逻辑测试 → 集成测试 → 实现）
5. services/discussion.ts（纯逻辑测试 → 集成测试 → 实现）
6. services/consensus.ts（纯逻辑测试 → 集成测试 → 实现）
```

每个模块严格遵循 RED → GREEN → REFACTOR。
