# TDD 后端工程实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 server 后端工程，以 TDD 方式实现三项核心逻辑模块（嘉宾生成、发言调度、共识提炼）。

**Architecture:** 独立 `server/` 项目，`services/llm.ts` 封装 DeepSeek API 并暴露 `LLMClient` 接口供依赖注入；三个核心 service 各自内嵌 prompt 模板 + Zod 解析 + 业务校验；纯逻辑测试使用 MockLLMClient，集成测试调真实 API。

**Tech Stack:** Node.js 24 / TypeScript 5.8 / Vitest 4 / Zod 3 / OpenAI SDK 4 / better-sqlite3 11 / pnpm

## Global Constraints

- `server/` 为独立 package.json，非 pnpm workspace
- 所有类型文件使用 TypeScript strict 模式
- TDD 铁律：先写失败的测试 → 验证失败 → 最小实现 → 验证通过 → 提交
- 纯逻辑测试不调真实 API，集成测试调真实 DeepSeek API
- 三项核心 service 不直接操作数据库
- 重试策略仅应用于 panelist（1 次重试）
- 集成测试只验结构不验内容，超时 30s
- 所有面向用户的错误信息使用中文

---

### Task 1: Server 工程脚手架

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/.env`
- Create: `server/.gitignore`
- Create: `server/src/` (directory structure)
- Create: `server/tests/` (directory structure)

**Interfaces:**
- Produces: `server/package.json` with all dependencies, `server/tsconfig.json` with strict settings, `server/vitest.config.ts` with testMatch pattern

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "ai-panel-studio-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --testMatch 'tests/**/*.integration.test.ts'",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "express": "^5.1.0",
    "openai": "^4.73.0",
    "uuid": "^11.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/express": "^5.0.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "~5.8.0",
    "vitest": "^4.0.0"
  }
}
```

- [ ] **Step 2: 创建 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: 创建 server/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testMatch: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: 创建 server/.env 和 server/.gitignore**

`server/.env`:
```
DEEPSEEK_API_KEY=sk-your-key-here
PORT=3001
DATABASE_PATH=./data/panel.db
```

`server/.gitignore`:
```
node_modules/
dist/
data/
.env
```

- [ ] **Step 5: 创建目录结构并安装依赖**

```bash
mkdir -p server/src/types server/src/services server/src/utils server/src/db
mkdir -p server/tests/services
mkdir -p server/data
touch server/data/.gitkeep
cd server && pnpm install
```

- [ ] **Step 6: 验证脚手架**

```bash
cd server && pnpm test
```

Expected: `No test files found` (vitest 正常启动但无测试文件)

- [ ] **Step 7: 提交**

```bash
git add server/package.json server/pnpm-lock.yaml server/tsconfig.json server/vitest.config.ts server/.gitignore server/.env server/data/.gitkeep
git commit -m "chore: scaffold server project with vitest"
```

---

### Task 2: 基础类型、错误工具与 DB 初始化

**Files:**
- Create: `server/src/types/index.ts`
- Create: `server/src/utils/errors.ts`
- Create: `server/src/db/index.ts`
- Create: `server/tests/setup.ts`

**Interfaces:**
- Produces:
  - `LLMClient` interface — `chat(messages: { role: string; content: string }[]): Promise<string>`
  - `GeneratePanelistsInput` — `{ topic: string; expert_count: number }`
  - `GeneratedPanelist` — `{ name: string; role: PanelistRole; title: string; stance: string; color: string }`
  - `SchedulingContext` — `{ topic, messages, panelists }`
  - `ConsensusInput` — `{ topic, recentMessages, existingConsensus, existingDivergence }`
  - `AppError` / `ValidationError` / `LLMParseError` classes
  - `getDb(dbPath?)` / `closeDb()` functions

- [ ] **Step 1: 创建 server/src/types/index.ts**

```typescript
// ===== 枚举类型（与 client 对齐） =====

export type DiscussionStatus = 'pending' | 'live' | 'ended'
export type PanelistRole = 'host' | 'expert'
export type PanelistStatus = 'standby' | 'preparing' | 'speaking'
export type MessageType = 'opening' | 'statement' | 'rebuttal' | 'supplement' | 'closing'

// ===== 数据库行类型（snake_case 对齐 SQLite） =====

export interface DiscussionRow {
  id: string
  topic: string
  expert_count: number
  status: DiscussionStatus
  created_at: string
}

export interface PanelistRow {
  id: string
  discussion_id: string
  name: string
  role: PanelistRole
  title: string
  stance: string
  color: string
  status: PanelistStatus
  focus: string | null
}

export interface MessageRow {
  id: string
  discussion_id: string
  panelist_id: string
  content: string
  type: MessageType
  seq: number
  created_at: string
}

export interface ConsensusRow {
  id: string
  discussion_id: string
  content: string
  confidence: number
  updated_at: string
}

export interface DivergenceRow {
  id: string
  discussion_id: string
  content: string
  perspectives: string // SQLite 存 JSON string
  updated_at: string
}

// ===== LLM 客户端接口（依赖注入） =====

export interface LLMClient {
  chat(messages: { role: string; content: string }[]): Promise<string>
}

// ===== 业务层输入/输出类型 =====

export interface GeneratePanelistsInput {
  topic: string
  expert_count: number
}

export interface GeneratedPanelist {
  name: string
  role: PanelistRole
  title: string
  stance: string
  color: string
}

export interface SchedulingContext {
  topic: string
  messages: { panelist_id: string; name: string; content: string; type: MessageType }[]
  panelists: { id: string; name: string; role: PanelistRole; status: PanelistStatus }[]
}

export interface ConsensusInput {
  topic: string
  recentMessages: { panelist_id: string; name: string; content: string }[]
  existingConsensus: { id: string; content: string; confidence: number }[]
  existingDivergence: { id: string; content: string; perspectives: string[] }[]
}
```

- [ ] **Step 2: 创建 server/src/utils/errors.ts**

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400)
    this.name = 'ValidationError'
  }
}

export class LLMParseError extends AppError {
  constructor(message: string) {
    super('LLM_PARSE_ERROR', message, 502)
    this.name = 'LLMParseError'
  }
}
```

- [ ] **Step 3: 创建 server/src/db/index.ts**

```typescript
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let db: Database.Database | null = null

export function getDb(dbPath?: string): Database.Database {
  if (!db) {
    const resolvedPath = dbPath || path.resolve(__dirname, '../../data/panel.db')
    db = new Database(resolvedPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
```

- [ ] **Step 4: 创建 server/tests/setup.ts**

```typescript
import type { LLMClient } from '../src/types/index.js'

export class MockLLMClient implements LLMClient {
  private responses: string[] = []

  addResponse(data: unknown): void {
    this.responses.push(JSON.stringify(data))
  }

  addRawResponse(text: string): void {
    this.responses.push(text)
  }

  async chat(): Promise<string> {
    return this.responses.shift() ?? '{}'
  }
}
```

- [ ] **Step 5: 验证 TypeScript 编译**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: 提交**

```bash
git add server/src/types/index.ts server/src/utils/errors.ts server/src/db/index.ts server/tests/setup.ts
git commit -m "feat: add base types, error utils, and db init"
```

---

### Task 3: LLM 适配器

**Files:**
- Create: `server/src/services/llm.ts`

**Interfaces:**
- Consumes: `LLMClient` from `../types`
- Produces: `createLLMClient(apiKey: string): LLMClient`

- [ ] **Step 1: 创建 server/src/services/llm.ts**

```typescript
import OpenAI from 'openai'
import type { LLMClient } from '../types/index.js'

export function createLLMClient(apiKey: string): LLMClient {
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey,
  })

  return {
    async chat(messages) {
      const res = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        temperature: 0.8,
      })
      return res.choices[0]?.message?.content ?? ''
    },
  }
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd server && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: 提交**

```bash
git add server/src/services/llm.ts
git commit -m "feat: add DeepSeek LLM client adapter"
```

---

### Task 4: Panelist 纯逻辑测试（RED）

**Files:**
- Create: `server/tests/services/panelist.test.ts`

**Interfaces:**
- Consumes: `generatePanelists` from `../../src/services/panelist` (not yet implemented), `MockLLMClient` from `../setup`

- [ ] **Step 1: 创建 server/tests/services/panelist.test.ts**

```typescript
import { describe, test, expect } from 'vitest'
import { generatePanelists } from '../../src/services/panelist.js'
import { MockLLMClient } from '../setup.js'

const validResponse = {
  panelists: [
    { name: '张澜', role: 'host', title: '科技媒体人', stance: '中立主持', color: '#FFD54F' },
    { name: '李明远', role: 'expert', title: 'AI科学家', stance: 'AI增强论', color: '#4FC3F7' },
    { name: '王若曦', role: 'expert', title: '艺术家', stance: '危机论', color: '#EF5350' },
    { name: '陈建国', role: 'expert', title: '教育学家', stance: '融合论', color: '#66BB6A' },
  ],
}

describe('generatePanelists - 输入校验', () => {
  test('空话题抛出 VALIDATION_ERROR', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: '', expert_count: 3 }, mock)
    ).rejects.toThrow('话题不能为空')
  })

  test('expert_count 为 0 抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: 0 }, mock)
    ).rejects.toThrow('专家人数')
  })

  test('expert_count 为负数抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: -1 }, mock)
    ).rejects.toThrow('专家人数')
  })

  test('expert_count > 8 抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: 9 }, mock)
    ).rejects.toThrow('专家人数')
  })
})

describe('generatePanelists - 响应解析', () => {
  test('正常 JSON 返回解析为正确的嘉宾数组', async () => {
    const mock = new MockLLMClient()
    mock.addResponse(validResponse)
    const result = await generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual(validResponse.panelists[0])
  })

  test('LLM 返回时用 markdown 代码块包裹 JSON → 正确解析', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('```json\n' + JSON.stringify(validResponse) + '\n```')
    const result = await generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    expect(result).toHaveLength(4)
  })

  test('LLM 返回非法 JSON → 重试后仍失败则抛出 LLM_PARSE_ERROR', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('这不是合法的 JSON {{{')
    mock.addRawResponse('仍然不是 JSON ###')
    await expect(
      generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    ).rejects.toThrow('LLM')
  })

  test('返回缺少必填字段 name → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [{ role: 'host', title: 'x', stance: 'x', color: '#000000' }],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('LLM')
  })

  test('返回非法 role 值 → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [{ name: 'A', role: 'moderator', title: 'x', stance: 'x', color: '#000000' }],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('LLM')
  })

  test('返回非法 color 格式 → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [{ name: 'A', role: 'host', title: 'x', stance: 'x', color: 'red' }],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('LLM')
  })
})

describe('generatePanelists - 业务约束', () => {
  test('必须恰好有 1 个 host', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'expert', title: 'x', stance: 'x', color: '#111111' },
        { name: 'B', role: 'expert', title: 'x', stance: 'x', color: '#222222' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('主持人')
  })

  test('host 多于 1 个 → 抛出错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'host', title: 'x', stance: 'x', color: '#111111' },
        { name: 'B', role: 'host', title: 'x', stance: 'x', color: '#222222' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 1 }, mock)
    ).rejects.toThrow('主持人')
  })

  test('专家人数与请求不一致 → 抛出错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'host', title: 'x', stance: 'x', color: '#111111' },
        { name: 'B', role: 'expert', title: 'x', stance: 'x', color: '#222222' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 3 }, mock)
    ).rejects.toThrow('专家人数')
  })

  test('所有嘉宾颜色不重复', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      panelists: [
        { name: 'A', role: 'host', title: 'x', stance: 'x', color: '#FFD54F' },
        { name: 'B', role: 'expert', title: 'x', stance: 'x', color: '#FFD54F' },
        { name: 'C', role: 'expert', title: 'x', stance: 'x', color: '#FFD54F' },
      ],
    })
    await expect(
      generatePanelists({ topic: 'AI', expert_count: 2 }, mock)
    ).rejects.toThrow('颜色')
  })
})

describe('generatePanelists - 重试逻辑', () => {
  test('首次解析失败后重试成功 → 返回正确结果', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('非法的 JSON {{{')
    mock.addResponse(validResponse)
    const result = await generatePanelists({ topic: 'AI与教育', expert_count: 3 }, mock)
    expect(result).toHaveLength(4)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server && pnpm test
```

Expected: 全部 FAIL — `generatePanelists` 尚未实现，每个测试因模块导入失败或函数未定义而失败。

- [ ] **Step 3: 提交**

```bash
git add server/tests/services/panelist.test.ts
git commit -m "test: add panelist generation unit tests"
```

---

### Task 5: Panelist 实现（GREEN）

**Files:**
- Create: `server/src/services/panelist.ts`

**Interfaces:**
- Consumes: `LLMClient`, `GeneratePanelistsInput`, `GeneratedPanelist` from `../types`; `ValidationError`, `LLMParseError` from `../utils/errors`
- Produces: `generatePanelists(input: GeneratePanelistsInput, llm: LLMClient): Promise<GeneratedPanelist[]>`

- [ ] **Step 1: 创建 server/src/services/panelist.ts**

```typescript
import { z } from 'zod'
import type { LLMClient, GeneratePanelistsInput, GeneratedPanelist } from '../types/index.js'
import { ValidationError, LLMParseError } from '../utils/errors.js'

// ===== Zod Schemas =====

const PanelistSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['host', 'expert']),
  title: z.string().min(1),
  stance: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

const ResponseSchema = z.object({
  panelists: z.array(PanelistSchema),
})

// ===== Prompt 模板 =====

function buildSystemPrompt(): string {
  return `你是一个圆桌讨论嘉宾生成器。根据用户提供的讨论话题和专家人数，生成一组 AI 圆桌讨论嘉宾阵容。

规则：
1. 生成 1 位主持人(role: "host") + N 位专家(role: "expert")，N 等于用户指定的专家人数
2. 每位嘉宾必须包含：
   - name: 中文姓名
   - role: "host" 或 "expert"
   - title: 职业头衔（如"AI研究员"、"社会学家"等）
   - stance: 对该话题的立场描述（一句话概括观点倾向）
   - color: 十六进制颜色代码（如 #FF5733），用于 UI 标识
3. 颜色必须各不相同，选用高辨识度的 Material Design 色板颜色
4. 各专家的立场应具有多样性和张力，覆盖不同视角
5. 主持人的立场应偏中立，主要负责引导讨论

严格以 JSON 格式返回：
{"panelists": [{"name": "...", "role": "host", "title": "...", "stance": "...", "color": "#XXXXXX"}]}`
}

function buildUserPrompt(topic: string, expertCount: number): string {
  return `讨论话题：${topic}\n指定专家人数：${expertCount}`
}

// ===== JSON 提取 =====

function extractJson(response: string): string {
  const codeBlock = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) return codeBlock[1].trim()

  const firstBrace = response.indexOf('{')
  const lastBrace = response.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return response.slice(firstBrace, lastBrace + 1)
  }

  return response.trim()
}

// ===== 解析与校验 =====

function parseResponse(response: string): GeneratedPanelist[] {
  const jsonStr = extractJson(response)
  let data: unknown
  try {
    data = JSON.parse(jsonStr)
  } catch {
    throw new LLMParseError('LLM 返回内容无法解析为 JSON')
  }

  const result = ResponseSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new LLMParseError(`LLM 返回格式不符合预期: ${issues}`)
  }

  return result.data.panelists
}

function validatePanelists(panelists: GeneratedPanelist[], expectedExpertCount: number): void {
  const hosts = panelists.filter(p => p.role === 'host')
  if (hosts.length !== 1) {
    throw new LLMParseError(`主持人数量应为 1，实际为 ${hosts.length}`)
  }

  const experts = panelists.filter(p => p.role === 'expert')
  if (experts.length !== expectedExpertCount) {
    throw new LLMParseError(`专家人数应为 ${expectedExpertCount}，实际为 ${experts.length}`)
  }

  const colors = panelists.map(p => p.color.toLowerCase())
  if (new Set(colors).size !== colors.length) {
    throw new LLMParseError('嘉宾颜色存在重复')
  }
}

// ===== 主函数 =====

export async function generatePanelists(
  input: GeneratePanelistsInput,
  llm: LLMClient
): Promise<GeneratedPanelist[]> {
  // 输入校验
  if (!input.topic.trim()) {
    throw new ValidationError('话题不能为空')
  }
  if (input.expert_count < 1 || input.expert_count > 8) {
    throw new ValidationError('专家人数必须在 1-8 之间')
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(input.topic, input.expert_count) },
  ]

  let response = await llm.chat(messages)

  try {
    const panelists = parseResponse(response)
    validatePanelists(panelists, input.expert_count)
    return panelists
  } catch (e) {
    if (e instanceof LLMParseError) {
      // 重试 1 次
      response = await llm.chat(messages)
      const panelists = parseResponse(response)
      validatePanelists(panelists, input.expert_count)
      return panelists
    }
    throw e
  }
}
```

- [ ] **Step 2: 运行测试验证通过**

```bash
cd server && pnpm test
```

Expected: 全部 14 个测试 PASS（纯逻辑测试使用 MockLLMClient，不调真实 API）。

- [ ] **Step 3: 提交**

```bash
git add server/src/services/panelist.ts
git commit -m "feat: implement panelist generation service"
```

---

### Task 6: Panelist 集成测试

**Files:**
- Create: `server/tests/services/panelist.integration.test.ts`

**Interfaces:**
- Consumes: `generatePanelists` from `../../src/services/panelist`, `createLLMClient` from `../../src/services/llm`
- Note: 需要有效的 `DEEPSEEK_API_KEY` 环境变量

- [ ] **Step 1: 创建 server/tests/services/panelist.integration.test.ts**

```typescript
import { describe, test, expect } from 'vitest'
import { generatePanelists } from '../../src/services/panelist.js'
import { createLLMClient } from '../../src/services/llm.js'

const apiKey = process.env.DEEPSEEK_API_KEY
const runIntegration = !!(apiKey && apiKey !== 'sk-your-key-here')
const describeIf = runIntegration ? describe : describe.skip

describeIf('generatePanelists - 集成测试', () => {
  // apiKey 非空已由 describeIf 保证
  const llm = createLLMClient(apiKey!)

  test('给定话题生成合法嘉宾阵容', async () => {
    const result = await generatePanelists(
      { topic: 'AI技术对教育公平的影响', expert_count: 3 },
      llm
    )
    expect(result).toHaveLength(4) // 1 host + 3 expert
    expect(result.filter(p => p.role === 'host')).toHaveLength(1)
    expect(result.filter(p => p.role === 'expert')).toHaveLength(3)

    const colors = result.map(p => p.color.toLowerCase())
    expect(new Set(colors).size).toBe(4)

    result.forEach(p => {
      expect(p.name).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(p.stance).toBeTruthy()
      expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  }, 30000)

  test('不同话题产生不同的嘉宾阵容', async () => {
    const a = await generatePanelists({ topic: '自动驾驶伦理', expert_count: 2 }, llm)
    const b = await generatePanelists({ topic: '远程办公的未来', expert_count: 2 }, llm)

    // 至少 names 不完全相同
    const namesA = new Set(a.map(p => p.name))
    const namesB = new Set(b.map(p => p.name))
    const overlap = [...namesA].filter(n => namesB.has(n))
    expect(overlap.length).toBeLessThan(a.length) // 不应全部重复
  }, 60000)
})
```

- [ ] **Step 2: 运行集成测试（需配置 API Key）**

```bash
cd server && pnpm test:integration
```

Expected: 如果 `DEEPSEEK_API_KEY` 有效 → 2 个 PASS；如果未配置 → skipped。

- [ ] **Step 3: 提交**

```bash
git add server/tests/services/panelist.integration.test.ts
git commit -m "test: add panelist integration tests"
```

---

### Task 7: Discussion 纯逻辑测试（RED）

**Files:**
- Create: `server/tests/services/discussion.test.ts`

**Interfaces:**
- Consumes: `decideNextSpeaker` from `../../src/services/discussion` (not yet implemented), `MockLLMClient` from `../setup`

- [ ] **Step 1: 创建 server/tests/services/discussion.test.ts**

```typescript
import { describe, test, expect } from 'vitest'
import { decideNextSpeaker } from '../../src/services/discussion.js'
import { MockLLMClient } from '../setup.js'

const sampleCtx = {
  topic: 'AI与教育',
  panelists: [
    { id: 'p-host', name: '张澜', role: 'host' as const, status: 'standby' as const },
    { id: 'p-exp1', name: '李明远', role: 'expert' as const, status: 'standby' as const },
    { id: 'p-exp2', name: '王若曦', role: 'expert' as const, status: 'standby' as const },
    { id: 'p-exp3', name: '陈建国', role: 'expert' as const, status: 'standby' as const },
  ],
  messages: [
    { panelist_id: 'p-host', name: '张澜', content: '欢迎各位', type: 'opening' as const },
    { panelist_id: 'p-exp1', name: '李明远', content: '我认为AI是工具', type: 'statement' as const },
  ],
}

const validDecision = {
  panelist_id: 'p-exp2',
  type: 'rebuttal',
  content: '我不完全同意，AI不仅仅是工具。',
}

describe('decideNextSpeaker - 输入校验', () => {
  test('空嘉宾列表抛出错误', async () => {
    const mock = new MockLLMClient()
    await expect(
      decideNextSpeaker({ topic: '测试', panelists: [], messages: [] }, mock)
    ).rejects.toThrow('嘉宾列表')
  })

  test('LLM 返回不存在的 panelist_id → 抛出解析错误', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'nonexistent', type: 'statement', content: '...' })
    await expect(
      decideNextSpeaker(sampleCtx, mock)
    ).rejects.toThrow('LLM')
  })
})

describe('decideNextSpeaker - 发言类型校验', () => {
  test('LLM 返回非法 MessageType → 降级为 statement', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-exp1', type: 'yelling', content: '我反对！' })
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.type).toBe('statement')
  })

  test('正常返回 type=rebuttal → 保持不变', async () => {
    const mock = new MockLLMClient()
    mock.addResponse(validDecision)
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.type).toBe('rebuttal')
  })
})

describe('decideNextSpeaker - 发言序列规则', () => {
  test('同一嘉宾已连续发言 2 次 → 再次选择时抛出错误', async () => {
    const ctx = {
      ...sampleCtx,
      messages: [
        ...sampleCtx.messages,
        { panelist_id: 'p-exp1', name: '李明远', content: '第二次发言', type: 'statement' as const },
        { panelist_id: 'p-exp1', name: '李明远', content: '第三次连续', type: 'supplement' as const },
      ],
    }
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-exp1', type: 'statement', content: '第四条' })
    await expect(decideNextSpeaker(ctx, mock)).rejects.toThrow('连续发言')
  })

  test('同一嘉宾只发言 1 次 → 可以再次被选中', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-exp1', type: 'statement', content: '继续发言' })
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.panelist_id).toBe('p-exp1')
  })
})

describe('decideNextSpeaker - 开场与结束', () => {
  test('无历史发言时 LLM 应返回 opening 类型', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-host', type: 'opening', content: '欢迎各位来到今天的圆桌讨论' })
    const result = await decideNextSpeaker(
      { topic: 'AI与教育', panelists: sampleCtx.panelists, messages: [] },
      mock
    )
    expect(result.type).toBe('opening')
    expect(result.panelist_id).toBe('p-host')
  })

  test('LLM 返回 closing → 讨论结束', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ panelist_id: 'p-host', type: 'closing', content: '感谢各位，今天的讨论到此结束' })
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.type).toBe('closing')
  })
})

describe('decideNextSpeaker - LLM 解析容错', () => {
  test('LLM 返回 markdown 包裹的 JSON → 正确解析', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('```json\n' + JSON.stringify(validDecision) + '\n```')
    const result = await decideNextSpeaker(sampleCtx, mock)
    expect(result.panelist_id).toBe('p-exp2')
  })

  test('LLM 返回非法 JSON → 抛出 LLM_PARSE_ERROR', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('invalid response without json')
    await expect(decideNextSpeaker(sampleCtx, mock)).rejects.toThrow('LLM')
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server && pnpm test
```

Expected: panelist 测试仍然 PASS，discussion 测试全部 FAIL（模块不存在）。

- [ ] **Step 3: 提交**

```bash
git add server/tests/services/discussion.test.ts
git commit -m "test: add discussion scheduling unit tests"
```

---

### Task 8: Discussion 实现（GREEN）

**Files:**
- Create: `server/src/services/discussion.ts`

**Interfaces:**
- Consumes: `LLMClient`, `SchedulingContext`, `MessageType` from `../types`; `ValidationError`, `LLMParseError` from `../utils/errors`
- Produces: `decideNextSpeaker(ctx: SchedulingContext, llm: LLMClient): Promise<{ panelist_id: string; type: MessageType; content: string }>`

- [ ] **Step 1: 创建 server/src/services/discussion.ts**

```typescript
import { z } from 'zod'
import type { LLMClient, SchedulingContext, MessageType } from '../types/index.js'
import { ValidationError, LLMParseError } from '../utils/errors.js'

// ===== 常量 =====

const VALID_MESSAGE_TYPES: MessageType[] = [
  'opening', 'statement', 'rebuttal', 'supplement', 'closing',
]

// ===== Zod Schema =====

const SchedulingResponseSchema = z.object({
  panelist_id: z.string().min(1),
  type: z.string(),
  content: z.string().min(1),
})

// ===== Prompt 模板 =====

function buildSystemPrompt(): string {
  return `你是一个圆桌讨论的调度员。根据当前讨论状态，决定下一位发言的嘉宾。

规则：
1. 分析所有嘉宾的角色和当前讨论进展，决定谁最应该下一个发言
2. 主持人(host)负责开场(opening)、串场追问、收尾总结(closing)
3. 专家(expert)进行观点陈述(statement)、补充(supplement)、反驳(rebuttal)
4. 非轮询制：哪位专家观点最需要被听到，就安排谁发言
5. 鼓励观点碰撞：如果最近发言存在可争议的点，优先安排持不同立场的专家反驳
6. 每位发言控制在 1-2 句话（约 50-150 字）
7. 如果讨论已经充分（通常 10-15 轮发言后），主持人可以做总结(closing)并结束讨论

严格以 JSON 格式返回：
{"panelist_id": "嘉宾ID", "type": "opening|statement|rebuttal|supplement|closing", "content": "发言内容"}`
}

function buildUserPrompt(ctx: SchedulingContext): string {
  const panelistList = ctx.panelists
    .map(p => `- id: ${p.id}, 姓名: ${p.name}, 角色: ${p.role}`)
    .join('\n')

  const history =
    ctx.messages.length > 0
      ? ctx.messages.map(m => `[${m.name}](${m.type}): ${m.content}`).join('\n')
      : '(讨论尚未开始，请主持人做开场发言)'

  return `讨论话题：${ctx.topic}

嘉宾列表：
${panelistList}

最近发言记录：
${history}

请决定下一位发言的嘉宾。`
}

// ===== 解析与校验 =====

function normalizeMessageType(type: string): MessageType {
  if (VALID_MESSAGE_TYPES.includes(type as MessageType)) {
    return type as MessageType
  }
  return 'statement'
}

function extractJson(response: string): string {
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new LLMParseError('LLM 返回中未找到 JSON 结构')
  }
  return jsonMatch[0]
}

function parseResponse(
  response: string,
  ctx: SchedulingContext
): { panelist_id: string; type: MessageType; content: string } {
  let data: unknown
  try {
    data = JSON.parse(extractJson(response))
  } catch {
    throw new LLMParseError('LLM 返回的 JSON 解析失败')
  }

  const result = SchedulingResponseSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new LLMParseError(`发言调度返回格式不符合预期: ${issues}`)
  }

  const { panelist_id, type, content } = result.data

  const validIds = ctx.panelists.map(p => p.id)
  if (!validIds.includes(panelist_id)) {
    throw new LLMParseError(`LLM 返回了不存在的嘉宾 ID: ${panelist_id}`)
  }

  return {
    panelist_id,
    type: normalizeMessageType(type),
    content,
  }
}

function checkConsecutiveRule(ctx: SchedulingContext, proposedPanelistId: string): void {
  if (ctx.messages.length < 2) return

  const lastTwo = ctx.messages.slice(-2)
  const samePanelist = lastTwo.every(m => m.panelist_id === proposedPanelistId)
  if (samePanelist) {
    throw new ValidationError('同一嘉宾不能连续发言超过 2 次')
  }
}

// ===== 主函数 =====

export async function decideNextSpeaker(
  ctx: SchedulingContext,
  llm: LLMClient
): Promise<{ panelist_id: string; type: MessageType; content: string }> {
  if (ctx.panelists.length === 0) {
    throw new ValidationError('嘉宾列表不能为空')
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(ctx) },
  ]

  const response = await llm.chat(messages)
  const result = parseResponse(response, ctx)
  checkConsecutiveRule(ctx, result.panelist_id)

  return result
}
```

- [ ] **Step 2: 运行全部测试**

```bash
cd server && pnpm test
```

Expected: panelist 14 个 PASS + discussion 11 个 PASS = 全部 25 个 PASS。

- [ ] **Step 3: 提交**

```bash
git add server/src/services/discussion.ts
git commit -m "feat: implement discussion scheduling service"
```

---

### Task 9: Discussion 集成测试

**Files:**
- Create: `server/tests/services/discussion.integration.test.ts`

**Interfaces:**
- Consumes: `decideNextSpeaker`, `createLLMClient`
- Note: 需要有效的 `DEEPSEEK_API_KEY`

- [ ] **Step 1: 创建 server/tests/services/discussion.integration.test.ts**

```typescript
import { describe, test, expect } from 'vitest'
import { decideNextSpeaker } from '../../src/services/discussion.js'
import { createLLMClient } from '../../src/services/llm.js'

const apiKey = process.env.DEEPSEEK_API_KEY
const runIntegration = !!(apiKey && apiKey !== 'sk-your-key-here')
const describeIf = runIntegration ? describe : describe.skip

const sampleCtx = {
  topic: '远程办公的利弊',
  panelists: [
    { id: 'p-host', name: '陈思远', role: 'host' as const, status: 'standby' as const },
    { id: 'p-exp1', name: '刘佳', role: 'expert' as const, status: 'standby' as const },
    { id: 'p-exp2', name: '王志强', role: 'expert' as const, status: 'standby' as const },
  ],
  messages: [
    { panelist_id: 'p-host', name: '陈思远', content: '今天我们来讨论远程办公的利弊', type: 'opening' as const },
    { panelist_id: 'p-exp1', name: '刘佳', content: '远程办公提高了工作效率和员工满意度', type: 'statement' as const },
  ],
}

describeIf('decideNextSpeaker - 集成测试', () => {
  const llm = createLLMClient(apiKey!)

  test('给定上下文返回合法的发言决策', async () => {
    const result = await decideNextSpeaker(sampleCtx, llm)

    // 返回的 panelist_id 必须在列表中
    const validIds = sampleCtx.panelists.map(p => p.id)
    expect(validIds).toContain(result.panelist_id)

    // type 必须是合法的 MessageType
    expect(['opening', 'statement', 'rebuttal', 'supplement', 'closing']).toContain(result.type)

    // content 不能为空
    expect(result.content).toBeTruthy()
    expect(result.content.length).toBeGreaterThan(10)
  }, 30000)

  test('空消息列表时主持人做开场发言', async () => {
    const result = await decideNextSpeaker(
      { topic: 'AI的伦理边界', panelists: sampleCtx.panelists, messages: [] },
      llm
    )
    expect(result.panelist_id).toBe('p-host')
    expect(result.content).toBeTruthy()
  }, 30000)
})
```

- [ ] **Step 2: 运行集成测试**

```bash
cd server && pnpm test:integration
```

Expected: panelist 2 个 + discussion 2 个 = 4 个 PASS（需有效 API Key）。

- [ ] **Step 3: 提交**

```bash
git add server/tests/services/discussion.integration.test.ts
git commit -m "test: add discussion integration tests"
```

---

### Task 10: Consensus 纯逻辑测试（RED）

**Files:**
- Create: `server/tests/services/consensus.test.ts`

**Interfaces:**
- Consumes: `extractConsensus` from `../../src/services/consensus` (not yet implemented), `MockLLMClient` from `../setup`

- [ ] **Step 1: 创建 server/tests/services/consensus.test.ts**

```typescript
import { describe, test, expect } from 'vitest'
import { extractConsensus } from '../../src/services/consensus.js'
import { MockLLMClient } from '../setup.js'

const sampleInput = {
  topic: 'AI与教育',
  recentMessages: [
    { panelist_id: 'p-1', name: '张教授', content: 'AI可以个性化辅导每个学生' },
    { panelist_id: 'p-2', name: '李老师', content: '但农村学校连网络都没有，何谈AI' },
    { panelist_id: 'p-3', name: '王博士', content: '我同意AI有潜力，但前提是解决接入问题' },
  ],
  existingConsensus: [
    { id: 'c-1', content: 'AI对教育有积极影响', confidence: 0.7 },
  ],
  existingDivergence: [
    { id: 'd-1', content: 'AI教育工具的普及速度', perspectives: ['乐观', '悲观'] },
  ],
}

const validConsensusResponse = {
  consensus: [
    { content: 'AI教育的推进需要先解决基础设施问题', confidence: 0.85 },
  ],
  divergence: [
    { content: 'AI取代教师 vs AI辅助教师', perspectives: ['AI将取代大部分教学工作', 'AI只能是辅助工具无法替代教师'] },
  ],
}

describe('extractConsensus - 正常流程', () => {
  test('从发言中提取共识和分歧', async () => {
    const mock = new MockLLMClient()
    mock.addResponse(validConsensusResponse)
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(1)
    expect(result.consensus[0].content).toBe(validConsensusResponse.consensus[0].content)
    expect(result.consensus[0].confidence).toBe(0.85)
    expect(result.divergence).toHaveLength(1)
  })

  test('无新发现时返回空数组', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ consensus: [], divergence: [] })
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })
})

describe('extractConsensus - 边界条件', () => {
  test('空发言列表 → 跳过提炼返回空数组', async () => {
    const mock = new MockLLMClient()
    const result = await extractConsensus(
      { ...sampleInput, recentMessages: [] },
      mock
    )
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })

  test('confidence 超出 0-1 范围 → Zod 校验失败 → 返回空（降级）', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      consensus: [{ content: '测试', confidence: 1.5 }],
      divergence: [],
    })
    const result = await extractConsensus(sampleInput, mock)
    // 解析失败 → 降级返回空数组
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })

  test('divergence 中 perspectives 少于 2 个 → 降级', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({
      consensus: [],
      divergence: [{ content: '某个分歧', perspectives: ['单一立场'] }],
    })
    const result = await extractConsensus(sampleInput, mock)
    expect(result.divergence).toHaveLength(0)
  })

  test('LLM 返回非法 JSON → 降级返回空数组', async () => {
    const mock = new MockLLMClient()
    mock.addRawResponse('这不是 JSON')
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })

  test('LLM 返回缺少 consensus 字段 → 降级', async () => {
    const mock = new MockLLMClient()
    mock.addResponse({ something: 'else' })
    const result = await extractConsensus(sampleInput, mock)
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server && pnpm test
```

Expected: panelist + discussion 测试 PASS，consensus 测试全部 FAIL（模块不存在）。

- [ ] **Step 3: 提交**

```bash
git add server/tests/services/consensus.test.ts
git commit -m "test: add consensus extraction unit tests"
```

---

### Task 11: Consensus 实现（GREEN）

**Files:**
- Create: `server/src/services/consensus.ts`

**Interfaces:**
- Consumes: `LLMClient`, `ConsensusInput` from `../types`; `LLMParseError` from `../utils/errors`
- Produces: `extractConsensus(input: ConsensusInput, llm: LLMClient): Promise<{ consensus: { content: string; confidence: number }[]; divergence: { content: string; perspectives: string[] }[] }>`

- [ ] **Step 1: 创建 server/src/services/consensus.ts**

```typescript
import { z } from 'zod'
import type { LLMClient, ConsensusInput } from '../types/index.js'
import { LLMParseError } from '../utils/errors.js'

// ===== Zod Schemas =====

const ConsensusItemSchema = z.object({
  content: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

const DivergenceItemSchema = z.object({
  content: z.string().min(1),
  perspectives: z.array(z.string().min(1)).min(2),
})

const ConsensusResponseSchema = z.object({
  consensus: z.array(ConsensusItemSchema),
  divergence: z.array(DivergenceItemSchema),
})

// ===== Prompt 模板 =====

function buildSystemPrompt(): string {
  return `你是一个圆桌讨论的共识和分歧分析器。分析最近的发言，提炼出：

1. 共识点(consensus)：各方趋于一致的观点，附带置信度(0-1)
   - 置信度基于赞同该观点的嘉宾比例估算
   - 如果某观点只有 1 人提出且无人回应，不要列为共识

2. 分歧点(divergence)：存在对立的观点，列出各方的不同立场
   - perspectives 至少包含 2 个不同立场
   - 每方立场用一句话概括

规则：
- 只提取发言中确实出现过的观点，不要凭空编造
- 如果近期发言没有新的共识或分歧，返回空数组
- 不要重复已有的共识/分歧（输入中提供了已有列表）
- 共识的 confidence 需根据发言中实际支持度合理估算

严格以 JSON 格式返回：
{"consensus": [{"content": "...", "confidence": 0.85}], "divergence": [{"content": "...", "perspectives": ["立场A", "立场B"]}]}`
}

function buildUserPrompt(input: ConsensusInput): string {
  const recentMsgs = input.recentMessages
    .map(m => `[${m.name}]: ${m.content}`)
    .join('\n')

  const existingItems = [
    ...input.existingConsensus.map(c => `- [共识] ${c.content} (置信度: ${c.confidence})`),
    ...input.existingDivergence.map(d =>
      `- [分歧] ${d.content} (立场: ${d.perspectives.join(' | ')})`
    ),
  ]

  return `讨论话题：${input.topic}

最近发言：
${recentMsgs}

已有共识/分歧：
${existingItems.length > 0 ? existingItems.join('\n') : '(尚无)'}

请分析并返回新发现的共识和分歧。`
}

// ===== 解析 =====

function extractJson(response: string): string {
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new LLMParseError('共识提炼返回中未找到 JSON 结构')
  }
  return jsonMatch[0]
}

function parseResponse(response: string): {
  consensus: { content: string; confidence: number }[]
  divergence: { content: string; perspectives: string[] }[]
} {
  let data: unknown
  try {
    data = JSON.parse(extractJson(response))
  } catch {
    throw new LLMParseError('共识提炼返回的 JSON 解析失败')
  }

  const result = ConsensusResponseSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new LLMParseError(`共识提炼返回格式不符合预期: ${issues}`)
  }

  return result.data
}

// ===== 主函数 =====

export async function extractConsensus(
  input: ConsensusInput,
  llm: LLMClient
): Promise<{
  consensus: { content: string; confidence: number }[]
  divergence: { content: string; perspectives: string[] }[]
}> {
  if (input.recentMessages.length === 0) {
    return { consensus: [], divergence: [] }
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(input) },
  ]

  try {
    const response = await llm.chat(messages)
    return parseResponse(response)
  } catch (e) {
    if (e instanceof LLMParseError) {
      // 解析失败：降级处理，保留现有结果不变（返回空表示无新发现）
      return { consensus: [], divergence: [] }
    }
    throw e
  }
}
```

- [ ] **Step 2: 运行全部测试**

```bash
cd server && pnpm test
```

Expected: panelist 14 + discussion 11 + consensus 7 = 全部 32 个 PASS。

- [ ] **Step 3: 提交**

```bash
git add server/src/services/consensus.ts
git commit -m "feat: implement consensus extraction service"
```

---

### Task 12: Consensus 集成测试

**Files:**
- Create: `server/tests/services/consensus.integration.test.ts`

**Interfaces:**
- Consumes: `extractConsensus`, `createLLMClient`
- Note: 需要有效的 `DEEPSEEK_API_KEY`

- [ ] **Step 1: 创建 server/tests/services/consensus.integration.test.ts**

```typescript
import { describe, test, expect } from 'vitest'
import { extractConsensus } from '../../src/services/consensus.js'
import { createLLMClient } from '../../src/services/llm.js'

const apiKey = process.env.DEEPSEEK_API_KEY
const runIntegration = !!(apiKey && apiKey !== 'sk-your-key-here')
const describeIf = runIntegration ? describe : describe.skip

const sampleInput = {
  topic: '碳中和的经济影响',
  recentMessages: [
    { panelist_id: 'p-1', name: 'Andrew Chen', content: '碳交易机制是成本最低的减碳方式，已被欧盟证实有效' },
    { panelist_id: 'p-2', name: '萨拉', content: '发展中国家不能承担与发达国家相同的减排成本，这不公平' },
    { panelist_id: 'p-3', name: '高桥', content: '太阳能成本过去十年下降了90%，技术突破会解决成本问题' },
    { panelist_id: 'p-1', name: 'Andrew Chen', content: '我同意技术是关键，但碳定价能加速技术采用' },
  ],
  existingConsensus: [],
  existingDivergence: [],
}

describeIf('extractConsensus - 集成测试', () => {
  const llm = createLLMClient(apiKey!)

  test('从发言中提取合法结构', async () => {
    const result = await extractConsensus(sampleInput, llm)

    // 验证结构
    expect(Array.isArray(result.consensus)).toBe(true)
    expect(Array.isArray(result.divergence)).toBe(true)

    // 验证 consensus 项
    result.consensus.forEach(c => {
      expect(c.content).toBeTruthy()
      expect(c.confidence).toBeGreaterThanOrEqual(0)
      expect(c.confidence).toBeLessThanOrEqual(1)
    })

    // 验证 divergence 项
    result.divergence.forEach(d => {
      expect(d.content).toBeTruthy()
      expect(d.perspectives.length).toBeGreaterThanOrEqual(2)
      d.perspectives.forEach(p => expect(p).toBeTruthy())
    })

    // 至少应有一些产出（共识或分歧）
    const hasOutput = result.consensus.length > 0 || result.divergence.length > 0
    expect(hasOutput).toBe(true)
  }, 30000)

  test('空发言列表返回空', async () => {
    const result = await extractConsensus(
      { ...sampleInput, recentMessages: [] },
      llm
    )
    expect(result.consensus).toHaveLength(0)
    expect(result.divergence).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行集成测试**

```bash
cd server && pnpm test:integration
```

Expected: panelist 2 + discussion 2 + consensus 2 = 6 个 PASS（需有效 API Key）。

- [ ] **Step 3: 运行全部纯逻辑测试确认无回归**

```bash
cd server && pnpm test
```

Expected: 32 个 PASS。

- [ ] **Step 4: 提交**

```bash
git add server/tests/services/consensus.integration.test.ts
git commit -m "test: add consensus integration tests"
```
