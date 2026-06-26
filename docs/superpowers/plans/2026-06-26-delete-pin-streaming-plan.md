# 讨论删除/置顶 + 流式输出 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现讨论列表右下角删除/置顶按钮 + 专家发言 token-by-token 流式输出

**Architecture:** 数据库新增 pinned_at 列；后端新增 DELETE/PATCH 端点，拆分 decideNextSpeaker 为调度决策+流式内容生成两步；前端 DiscussionList 新增按钮+确认弹窗，discussionStore 新增 message_token 事件处理实现逐 token 追加

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand v5 / Express 5 + sql.js + DeepSeek API (OpenAI 兼容)

## Global Constraints

- 置顶允许多条，按 pinned_at 倒序
- 删除需确认弹窗，删除活跃讨论后跳回首页
- 流式输出：调度决策（非流式）→ token-by-token SSE 推送 → 最终 transcript_message
- SSE 新增 `message_token` 事件类型
- 所有 UI 文本使用中文

---

### Task 1: 数据库 Schema — 新增 pinned_at 列

**Files:**
- Modify: `server/migrations/init.sql`

**Interfaces:**
- Produces: `discussions.pinned_at TIMESTAMP` 列，NULL 表示未置顶

- [ ] **Step 1: 在 init.sql 末尾添加 ALTER TABLE 语句**

在 `server/migrations/init.sql` 末尾追加：

```sql
-- v2: 讨论置顶
ALTER TABLE discussions ADD COLUMN pinned_at TIMESTAMP;
```

说明：`initDb()` 会运行所有语句，若列已存在则 catch 错误并继续，兼容已有数据库。

- [ ] **Step 2: 验证数据库迁移**

```bash
cd server && npx tsx -e "
import { initDb, getDb, queryAll } from './src/db/index.js';
await initDb();
const db = await getDb();
const cols = queryAll(db, 'PRAGMA table_info(discussions)');
console.log('columns:', cols.map(c => c.name));
"
```

Expected: 输出中包含 `pinned_at`

- [ ] **Step 3: Commit**

```bash
git add server/migrations/init.sql
git commit -m "schema: add pinned_at column to discussions"
```

---

### Task 2: 后端类型 — LLMClient 增加 streamChat + DiscussionRow 增加 pinned_at

**Files:**
- Modify: `server/src/types/index.ts`

**Interfaces:**
- Produces: `LLMClient.streamChat`, `DiscussionRow.pinned_at`

- [ ] **Step 1: 修改 DiscussionRow、LLMClient 和 SchedulingContext**

[server/src/types/index.ts:10-16] 修改 `DiscussionRow`：

```typescript
export interface DiscussionRow {
  id: string
  topic: string
  expert_count: number
  status: DiscussionStatus
  created_at: string
  pinned_at: string | null
}
```

[server/src/types/index.ts:58-60] 修改 `LLMClient`：

```typescript
export interface LLMClient {
  chat(messages: { role: string; content: string }[]): Promise<string>
  streamChat(messages: { role: string; content: string }[]): AsyncGenerator<string>
}
```

[server/src/types/index.ts:77-81] 修改 `SchedulingContext.panelists` 增加 `title` 和 `stance`：

```typescript
export interface SchedulingContext {
  topic: string
  messages: { panelist_id: string; name: string; content: string; type: MessageType }[]
  panelists: { id: string; name: string; role: PanelistRole; title: string; stance: string; status: PanelistStatus }[]
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 可能有暂时性错误（llm.ts 还未实现 streamChat），确认只有可预期的错误。

- [ ] **Step 3: Commit**

```bash
git add server/src/types/index.ts
git commit -m "schema: add pinned_at to DiscussionRow and streamChat to LLMClient"
```

---

### Task 3: LLM 服务 — 实现流式调用

**Files:**
- Modify: `server/src/services/llm.ts`

**Interfaces:**
- Consumes: `LLMClient` interface（Task 2 已修改）
- Produces: `createLLMClient()` 返回的 `streamChat` 方法

- [ ] **Step 1: 实现 streamChat**

将 [server/src/services/llm.ts](server/src/services/llm.ts) 中的 `createLLMClient` 修改为：

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

    async *streamChat(messages) {
      const stream = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        temperature: 0.8,
        stream: true,
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) yield delta
      }
    },
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd server && npx tsc --noEmit
```

Expected: `server/src/services/llm.ts` 无错误

- [ ] **Step 3: Commit**

```bash
git add server/src/services/llm.ts
git commit -m "feat: add streamChat method to LLM client"
```

---

### Task 4: 讨论服务 — 拆分 decideNextSpeaker + 新增 generateSpeechStream

**Files:**
- Modify: `server/src/services/discussion.ts`

**Interfaces:**
- Consumes: `LLMClient.streamChat`（Task 3）
- Produces: `decideNextSpeaker()` 返回 `{ panelist_id, type }`（无 content）；`generateSpeechStream()` 返回 `AsyncGenerator<string>`；`generateSpeechContent()` 返回 `Promise<string>`

- [ ] **Step 1: 修改 SchedulingResponseSchema 和 buildSystemPrompt**

[discussion.ts:9-13] 修改 schema：

```typescript
const SchedulingResponseSchema = z.object({
  panelist_id: z.string().min(1),
  type: z.string(),
})
```

[discussion.ts:15-28] 修改 system prompt（不再要求 LLM 生成 content）：

```typescript
function buildSystemPrompt(): string {
  return `你是一个圆桌讨论的调度员。根据当前讨论状态，决定下一位发言的嘉宾。

规则：
1. 分析所有嘉宾的角色和当前讨论进展，决定谁最应该下一个发言
2. 主持人(host)负责开场(opening)、串场追问、收尾总结(closing)
3. 专家(expert)进行观点陈述(statement)、补充(supplement)、反驳(rebuttal)
4. 非轮询制：哪位专家观点最需要被听到，就安排谁发言
5. 鼓励观点碰撞：如果最近发言存在可争议的点，优先安排持不同立场的专家反驳
6. 如果讨论已经充分（通常 10-15 轮发言后），主持人可以做总结(closing)并结束讨论

严格以 JSON 格式返回（只做调度，不写发言内容）：
{"panelist_id": "嘉宾ID", "type": "opening|statement|rebuttal|supplement|closing"}`
}
```

- [ ] **Step 2: 修改 parseResponse 和解构**

[discussion.ts:67-96] 修改 `parseResponse` 返回类型：

```typescript
function parseResponse(
  response: string,
  ctx: SchedulingContext
): { panelist_id: string; type: MessageType } {
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

  const { panelist_id, type } = result.data

  const validIds = ctx.panelists.map(p => p.id)
  if (!validIds.includes(panelist_id)) {
    throw new LLMParseError(`LLM 返回了不存在的嘉宾 ID: ${panelist_id}`)
  }

  return {
    panelist_id,
    type: normalizeMessageType(type),
  }
}
```

- [ ] **Step 3: 修改 decideNextSpeaker 签名和返回**

[discussion.ts:108-129] 修改函数签名和 log：

```typescript
export async function decideNextSpeaker(
  ctx: SchedulingContext,
  llm: LLMClient
): Promise<{ panelist_id: string; type: MessageType }> {
  if (ctx.panelists.length === 0) {
    throw new ValidationError('嘉宾列表不能为空')
  }

  console.log('[discussion] 开始发言调度, topic:', ctx.topic, 'panelist_count:', ctx.panelists.length, 'msg_count:', ctx.messages.length)

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(ctx) },
  ]

  const response = await llm.chat(messages)
  const result = parseResponse(response, ctx)
  checkConsecutiveRule(ctx, result.panelist_id)

  console.log('[discussion] 发言调度完成, next:', result.panelist_id, 'type:', result.type)
  return result
}
```

- [ ] **Step 4: 新增 generateSpeechStream 和 generateSpeechContent**

在文件末尾追加（`export async function decideNextSpeaker` 之后，最后一个 `}` 之前不行，要追加到文件末尾）：

```typescript
// ===== 流式发言内容生成 =====

function buildSpeechSystemPrompt(): string {
  return `你正在参加一场圆桌讨论。根据你的角色和立场，针对当前话题发表观点。

要求：
1. 严格以第一人称发言，直接输出对话内容，不加引号、不署名、不加角色标注
2. 控制在 1-2 句话（约 50-150 字）
3. 语言自然、口语化，像是在真实对话
4. 根据你的立场和角色表达观点，可适当回应或反驳前面的发言
5. 只输出发言原文，不输出任何其他内容`
}

function buildSpeechUserPrompt(
  ctx: SchedulingContext,
  decision: { panelist_id: string; type: MessageType }
): string {
  const panelist = ctx.panelists.find(p => p.id === decision.panelist_id)
  if (!panelist) throw new ValidationError('未找到发言嘉宾')

  const history =
    ctx.messages.length > 0
      ? ctx.messages.slice(-8).map(m => `[${m.name}](${m.type}): ${m.content}`).join('\n')
      : '(讨论尚未开始，你是第一个发言)'

  const typeHint: Record<string, string> = {
    opening: '你是主持人，请做一个精彩的开场白，引出话题',
    closing: '你是主持人，请对讨论进行总结收尾',
    statement: '请陈述你的核心观点',
    rebuttal: '请针对最近的不同观点进行反驳',
    supplement: '请在已有讨论基础上补充你的见解',
  }

  return `讨论话题：${ctx.topic}

你的身份：
- 名字：${panelist.name}
- 角色：${panelist.role === 'host' ? '主持人' : '专家'}
- 头衔：${panelist.title}
- 立场：${panelist.stance}

发言类型：${decision.type} — ${typeHint[decision.type] || '请发表观点'}

最近讨论记录：
${history}

现在请你以 ${panelist.name} 的身份发言。只输出发言原文。`
}

export async function* generateSpeechStream(
  ctx: SchedulingContext,
  decision: { panelist_id: string; type: MessageType },
  llm: LLMClient
): AsyncGenerator<string> {
  const messages = [
    { role: 'system', content: buildSpeechSystemPrompt() },
    { role: 'user', content: buildSpeechUserPrompt(ctx, decision) },
  ]

  for await (const token of llm.streamChat(messages)) {
    yield token
  }
}

export async function generateSpeechContent(
  ctx: SchedulingContext,
  decision: { panelist_id: string; type: MessageType },
  llm: LLMClient
): Promise<string> {
  let content = ''
  for await (const token of generateSpeechStream(ctx, decision, llm)) {
    content += token
  }
  return content
}
```

- [ ] **Step 5: 验证编译**

```bash
cd server && npx tsc --noEmit
```

Expected: `server/src/services/discussion.ts` 无错误

- [ ] **Step 6: Commit**

```bash
git add server/src/services/discussion.ts
git commit -m "feat: split scheduling decision from speech content generation with streaming"
```

---

### Task 5: 后端路由 — DELETE/PATCH 端点 + 排序 + SSE 流式改造

**Files:**
- Modify: `server/src/routes/discussions.ts`

**Interfaces:**
- Consumes: `decideNextSpeaker`（新签名）、`generateSpeechStream`、`generateSpeechContent`（Task 4）
- Produces: `DELETE /api/discussions/:id`、`PATCH /api/discussions/:id/pin`、修改排序、SSE message_token 事件、修改 confirm/start/next-step

- [ ] **Step 1: 更新 import**

[routes/discussions.ts:6] 修改 import：

```typescript
import { decideNextSpeaker, generateSpeechStream, generateSpeechContent } from '../services/discussion.js'
```

- [ ] **Step 2: 修改 GET / 排序**

[routes/discussions.ts:33] 修改排序 SQL：

```typescript
const discussions = queryAll(db,
  'SELECT * FROM discussions ORDER BY pinned_at IS NOT NULL DESC, pinned_at DESC, created_at DESC'
) as DiscussionRow[]
```

- [ ] **Step 3: 新增 DELETE 端点**

在 `GET /:id` 之后、`POST /:id/confirm` 之前插入：

```typescript
// DELETE /api/discussions/:id — 删除讨论
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow | undefined
    if (!discussion) {
      res.status(404).json({ error: '讨论不存在' })
      return
    }

    // FK ON DELETE CASCADE 自动删除关联数据
    execute(db, 'DELETE FROM discussions WHERE id = ?', [req.params.id])

    console.log('[DELETE /api/discussions/:id] 讨论已删除, id:', req.params.id)
    res.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/discussions/:id] 错误:', e)
    res.status(500).json({ error: '删除讨论失败' })
  }
})
```

- [ ] **Step 4: 新增 PATCH pin 端点**

在 DELETE 端点之后插入：

```typescript
// PATCH /api/discussions/:id/pin — 置顶/取消置顶
router.patch('/:id/pin', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow | undefined
    if (!discussion) {
      res.status(404).json({ error: '讨论不存在' })
      return
    }

    const { pinned } = req.body
    if (pinned) {
      execute(db, "UPDATE discussions SET pinned_at = datetime('now') WHERE id = ?", [req.params.id])
    } else {
      execute(db, 'UPDATE discussions SET pinned_at = NULL WHERE id = ?', [req.params.id])
    }

    const updated = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow
    console.log('[PATCH /api/discussions/:id/pin] 置顶状态更新, id:', req.params.id, 'pinned:', pinned)
    res.json(updated)
  } catch (e) {
    console.error('[PATCH /api/discussions/:id/pin] 错误:', e)
    res.status(500).json({ error: '置顶操作失败' })
  }
})
```

- [ ] **Step 5: 修改 POST /:id/confirm — 适配拆分后的调用**

将 confirm 端点中的 `decideNextSpeaker` 调用和消息插入逻辑改为：

```typescript
const decision = await decideNextSpeaker(
  {
    topic: discussion.topic,
    panelists: panelists.map(p => ({ id: p.id, name: p.name, role: p.role, title: p.title, stance: p.stance, status: p.status })),
    messages: messages.map(m => ({ panelist_id: m.panelist_id, name: '', content: m.content, type: m.type })),
  },
  llm
)

const msgId = uuidv4()
const nextSeq = messages.length + 1
execute(db,
  'INSERT INTO messages (id, discussion_id, panelist_id, content, type, seq) VALUES (?, ?, ?, ?, ?, ?)',
  [msgId, req.params.id, decision.panelist_id, '', decision.type, nextSeq]
)

execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['speaking', decision.panelist_id])
execute(db, 'INSERT INTO panelist_status_logs (id, panelist_id, status, focus) VALUES (?, ?, ?, ?)',
  [uuidv4(), decision.panelist_id, 'speaking', null]
)

// 生成发言内容（非流式，REST 端点收集全部 token）
const panelistNameMap: Record<string, string> = {}
for (const p of panelists) {
  panelistNameMap[p.id] = p.name
}
const speechContent = await generateSpeechContent(
  {
    topic: discussion.topic,
    panelists: panelists.map(p => ({ id: p.id, name: p.name, role: p.role, title: p.title, stance: p.stance, status: p.status })),
    messages: messages.map(m => ({ panelist_id: m.panelist_id, name: panelistNameMap[m.panelist_id] || '', content: m.content, type: m.type })),
  },
  decision,
  llm
)

execute(db, 'UPDATE messages SET content = ? WHERE id = ?', [speechContent, msgId])
```

- [ ] **Step 6: 修改 POST /:id/start — 相同适配**

将 `/start` 端点中同样的逻辑做与 Step 5 相同的改造（decideNextSpeaker → 插入空 content → 生成内容 → UPDATE）。

- [ ] **Step 7: 修改 POST /:id/next-step — 相同适配**

将 `/next-step` 端点中同样的逻辑做与 Step 5 相同的改造。

- [ ] **Step 8: 修改 SSE GET /:id/stream — 流式推送改造**

将 SSE 主循环中的发言处理逻辑（从 `const decision = await decideNextSpeaker(...)` 到发送 `transcript_message` 之间的代码）替换为：

```typescript
const decision = await decideNextSpeaker(
  {
    topic: discussion.topic,
    panelists: currentPanelists.map(p => ({ id: p.id, name: p.name, role: p.role, title: p.title, stance: p.stance, status: p.status })),
    messages: currentMessages.map(m => ({
      panelist_id: m.panelist_id,
      name: nameMap[m.panelist_id] || '',
      content: m.content,
      type: m.type,
    })),
  },
  llm
)

if (aborted) break

// 写入占位消息
const msgId = uuidv4()
const nextSeq = currentMessages.length + 1
execute(db,
  'INSERT INTO messages (id, discussion_id, panelist_id, content, type, seq) VALUES (?, ?, ?, ?, ?, ?)',
  [msgId, req.params.id, decision.panelist_id, '', decision.type, nextSeq]
)

// 更新 panelist 状态
execute(db, 'UPDATE panelists SET status = ? WHERE discussion_id = ? AND status = ?', ['standby', req.params.id, 'speaking'])
execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['speaking', decision.panelist_id])
execute(db, 'INSERT INTO panelist_status_logs (id, panelist_id, status, focus) VALUES (?, ?, ?, ?)',
  [uuidv4(), decision.panelist_id, 'speaking', null]
)

// 发送 panelist_status 事件
const updatedPanelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
for (const p of updatedPanelists) {
  sendEvent('panelist_status', {
    panelist_id: p.id,
    status: p.status,
    focus: p.focus,
  })
}

// 流式生成发言内容
let fullContent = ''
try {
  for await (const token of generateSpeechStream(
    {
      topic: discussion.topic,
      panelists: currentPanelists.map(p => ({ id: p.id, name: p.name, role: p.role, title: p.title, stance: p.stance, status: p.status })),
      messages: currentMessages.map(m => ({
        panelist_id: m.panelist_id,
        name: nameMap[m.panelist_id] || '',
        content: m.content,
        type: m.type,
      })),
    },
    decision,
    llm
  )) {
    if (aborted) break
    fullContent += token
    sendEvent('message_token', {
      panelist_id: decision.panelist_id,
      token,
      seq: nextSeq,
    })
  }
} catch (streamErr) {
  console.error('[SSE] 流式生成失败:', streamErr)
  if (!aborted && fullContent.length === 0) {
    fullContent = '（发言生成失败）'
  }
}

if (aborted) break

// 持久化完整内容
execute(db, 'UPDATE messages SET content = ? WHERE id = ?', [fullContent, msgId])

// 发送完整 transcript_message
const speaker = updatedPanelists.find(p => p.id === decision.panelist_id)
sendEvent('transcript_message', {
  id: msgId,
  discussion_id: req.params.id,
  panelist_id: decision.panelist_id,
  name: speaker?.name ?? nameMap[decision.panelist_id] ?? '未知',
  title: speaker?.title ?? '',
  color: speaker?.color ?? '#888888',
  content: fullContent,
  type: decision.type,
  seq: nextSeq,
  created_at: new Date().toISOString(),
})
```

- [ ] **Step 9: 验证编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 10: Commit**

```bash
git add server/src/routes/discussions.ts
git commit -m "feat: add DELETE/PATCH pin endpoints, streaming SSE, updated sorting"
```

---

### Task 6: 前端类型 — 新增 MessageTokenEvent + pinned_at

**Files:**
- Modify: `client/src/types/index.ts`

**Interfaces:**
- Produces: `MessageTokenEvent`, `Discussion.pinned_at`, 更新 `SSEEventType`

- [ ] **Step 1: 修改 Discussion 接口和 SSE 类型**

[types/index.ts:8-14] Discussion 增加字段：

```typescript
export interface Discussion {
  id: string
  topic: string
  expert_count: number
  status: DiscussionStatus
  created_at: string
  pinned_at: string | null
}
```

[types/index.ts:64-69] SSEEventType 更新：

```typescript
export type SSEEventType =
  | 'panelist_status'
  | 'transcript_message'
  | 'message_token'
  | 'consensus_update'
  | 'divergence_update'
  | 'discussion_end'
```

在 `DiscussionEndEvent` 之后追加：

```typescript
export interface MessageTokenEvent {
  panelist_id: string
  token: string
  seq: number
}
```

- [ ] **Step 2: 验证编译**

```bash
cd client && npx tsc --noEmit
```

Expected: 可能有暂时性错误（stores 中还未使用新类型），确认只有可预期的错误。

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts
git commit -m "schema: add MessageTokenEvent, pinned_at to frontend types"
```

---

### Task 7: App Store — deleteDiscussion + togglePin

**Files:**
- Modify: `client/src/stores/appStore.ts`

**Interfaces:**
- Consumes: Discussion 新增 `pinned_at`（Task 6）
- Produces: `deleteDiscussion(id)`、`togglePin(id, pinned)`

- [ ] **Step 1: 更新 AppState interface 和实现**

在 [appStore.ts:4-18] `AppState` interface 中添加：

```typescript
interface AppState {
  // 讨论列表
  discussions: DiscussionSummary[]
  loading: boolean
  fetchDiscussions: () => Promise<void>

  // 当前活跃讨论
  activeDiscussionId: string | null
  setActiveDiscussion: (id: string | null) => void

  // 创建讨论弹窗
  createModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void

  // 删除 & 置顶
  deleteDiscussion: (id: string) => Promise<void>
  togglePin: (id: string, pinned: boolean) => Promise<void>
}
```

在 [appStore.ts:20-51] store 实现中添加两个 action（`closeCreateModal` 之后）：

```typescript
deleteDiscussion: async (id) => {
  await fetch(`/api/discussions/${id}`, { method: 'DELETE' })
  set((s) => ({
    discussions: s.discussions.filter(d => d.id !== id),
    activeDiscussionId: s.activeDiscussionId === id ? null : s.activeDiscussionId,
  }))
},

togglePin: async (id, pinned) => {
  await fetch(`/api/discussions/${id}/pin`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinned }),
  })
  // 重新拉取列表以获取正确排序
  await get().fetchDiscussions()
},
```

- [ ] **Step 2: 验证编译**

```bash
cd client && npx tsc --noEmit
```

Expected: `appStore.ts` 无错误

- [ ] **Step 3: Commit**

```bash
git add client/src/stores/appStore.ts
git commit -m "feat: add deleteDiscussion and togglePin to appStore"
```

---

### Task 8: Discussion Store — message_token 事件处理

**Files:**
- Modify: `client/src/stores/discussionStore.ts`

**Interfaces:**
- Consumes: `MessageTokenEvent`（Task 6）
- Produces: `appendMessageToken(panelist_id, token, seq)` — 逐 token 追加到 message.content

- [ ] **Step 1: 新增 appendMessageToken action 和 SSE 监听**

在 [discussionStore.ts:5-33] `DiscussionState` interface 中添加：

```typescript
// 实时更新
addMessage: (msg: Message) => void
appendMessageToken: (panelist_id: string, token: string, seq: number) => void
updatePanelistStatus: (e: PanelistStatusEvent) => void
```

在 [discussionStore.ts:114-118] `addMessage` 实现之后添加 `appendMessageToken`：

```typescript
appendMessageToken: (panelist_id, token, seq) =>
  set((s) => {
    const idx = s.messages.findIndex(m => m.seq === seq)
    if (idx >= 0) {
      // 已有占位消息，追加 token
      const updated = [...s.messages]
      updated[idx] = { ...updated[idx], content: updated[idx].content + token }
      return { messages: updated }
    }
    // 尚无占位消息，创建之
    const placeholder: Message = {
      id: `streaming-${seq}`,
      discussion_id: s.discussion?.id ?? '',
      panelist_id,
      name: s.panelists.find(p => p.id === panelist_id)?.name ?? '',
      title: s.panelists.find(p => p.id === panelist_id)?.title ?? '',
      color: s.panelists.find(p => p.id === panelist_id)?.color ?? '#888888',
      content: token,
      type: 'statement',
      seq,
      created_at: new Date().toISOString(),
    }
    // 按 seq 插入正确位置
    const inserted = [...s.messages, placeholder].sort((a, b) => a.seq - b.seq)
    return { messages: inserted }
  }),
```

在 [discussionStore.ts:78-101] `connectSSE` 中添加 `message_token` 监听（在 `panelist_status` 监听之后）：

```typescript
es.addEventListener('message_token', (e) => {
  const data: { panelist_id: string; token: string; seq: number } = JSON.parse(e.data)
  get().appendMessageToken(data.panelist_id, data.token, data.seq)
})
```

同时修改 `addMessage`，使其用完整 message 替换占位行（处理 transcript_message 在 message_token 之后到达的情况）：

将 [discussionStore.ts:114-118] 的 `addMessage` 修改为：

```typescript
addMessage: (msg) =>
  set((s) => {
    // 替换流式占位行（同一 seq），或去重（同一 id）
    const idxById = s.messages.findIndex(m => m.id === msg.id)
    if (idxById >= 0) return s // 已存在，跳过
    const idxBySeq = s.messages.findIndex(m => m.seq === msg.seq && m.id.startsWith('streaming-'))
    if (idxBySeq >= 0) {
      const updated = [...s.messages]
      updated[idxBySeq] = msg
      return { messages: updated }
    }
    return { messages: [...s.messages, msg].sort((a, b) => a.seq - b.seq) }
  }),
```

- [ ] **Step 2: 验证编译**

```bash
cd client && npx tsc --noEmit
```

Expected: `discussionStore.ts` 无错误

- [ ] **Step 3: Commit**

```bash
git add client/src/stores/discussionStore.ts
git commit -m "feat: add message_token streaming support to discussionStore"
```

---

### Task 9: DiscussionList — 置顶/删除按钮 + 确认弹窗

**Files:**
- Modify: `client/src/components/discussion/DiscussionList.tsx`
- Modify: `client/src/components/layout/Icons.tsx`

**Interfaces:**
- Consumes: `deleteDiscussion`、`togglePin`（Task 7）
- Produces: 卡片右下角 PinIcon + DeleteIcon，删除确认 Modal

- [ ] **Step 1: 新增 PinIcon 和 DeleteIcon**

在 [Icons.tsx:35] 文件末尾追加：

```typescript
export function PinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M5 9l7-7 7 7" />
    </svg>
  )
}

export function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
```

- [ ] **Step 2: 改造 DiscussionList 组件**

完整替换 [DiscussionList.tsx](client/src/components/discussion/DiscussionList.tsx)：

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { PlusIcon, PinIcon, DeleteIcon, CloseIcon } from '../layout/Icons'
import type { DiscussionSummary } from '../../types'

interface Props {
  onNewDiscussion: () => void
}

export function DiscussionList({ onNewDiscussion }: Props) {
  const {
    discussions, loading, activeDiscussionId,
    setActiveDiscussion, deleteDiscussion, togglePin,
  } = useAppStore()
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<DiscussionSummary | null>(null)

  const handleSelect = (d: DiscussionSummary) => {
    setActiveDiscussion(d.id)
    navigate(`/discussion/${d.id}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteDiscussion(deleteTarget.id)
    setDeleteTarget(null)
  }

  const statusLabel = (s: string) => {
    switch (s) {
      case 'live': return '● 进行中'
      case 'pending': return '○ 待开始'
      case 'ended': return '◎ 已结束'
    }
  }

  const statusClass = (s: string) => {
    switch (s) {
      case 'live': return 'text-status-green'
      case 'pending': return 'text-status-amber'
      case 'ended': return 'text-status-gray'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b border-border-glow flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">讨论列表</h2>
        <button
          onClick={onNewDiscussion}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-accent-cyan cursor-pointer"
          title="发起新讨论"
        >
          <PlusIcon />
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && discussions.length === 0 && (
          <p className="text-text-dim text-sm text-center py-8">加载中...</p>
        )}

        {!loading && discussions.length === 0 && (
          <p className="text-text-dim text-sm text-center py-8">
            暂无讨论，点击 + 发起
          </p>
        )}

        {discussions.map((d) => (
          <div
            key={d.id}
            className={`relative group w-full text-left p-3 rounded-xl border transition-all
              ${d.id === activeDiscussionId
                ? 'border-accent-cyan bg-accent-cyan/10 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                : 'border-white/5 hover:border-white/15 bg-white/[0.02]'
              }`}
          >
            {/* 主点击区域 */}
            <button
              onClick={() => handleSelect(d)}
              className="w-full text-left pr-16 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                {d.pinned_at && (
                  <span className="text-accent-cyan shrink-0">
                    <PinIcon filled />
                  </span>
                )}
                <p className="text-sm font-medium text-text-primary truncate">{d.topic}</p>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-text-dim">
                <span className={statusClass(d.status)}>{statusLabel(d.status)}</span>
                <span>{d.panelist_count} 位嘉宾</span>
                <span>{d.message_count} 条发言</span>
              </div>
            </button>

            {/* 右下角操作按钮 */}
            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); togglePin(d.id, !d.pinned_at) }}
                className={`p-1.5 rounded-md transition-colors cursor-pointer
                  ${d.pinned_at
                    ? 'text-accent-cyan bg-accent-cyan/10'
                    : 'text-text-dim hover:text-text-primary hover:bg-white/10'
                  }`}
                title={d.pinned_at ? '取消置顶' : '置顶'}
              >
                <PinIcon filled={!!d.pinned_at} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(d) }}
                className="p-1.5 rounded-md text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                title="删除讨论"
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-dark border border-border-glow rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">确认删除</h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-md hover:bg-white/10 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="text-sm text-text-dim mb-2">
              确定要删除以下讨论吗？此操作不可撤销。
            </p>
            <p className="text-sm font-medium text-text-primary mb-6 truncate">
              "{deleteTarget.topic}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 px-4 rounded-xl border border-white/10 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer text-sm"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 px-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer text-sm font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
cd client && npx tsc --noEmit
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add client/src/components/discussion/DiscussionList.tsx client/src/components/layout/Icons.tsx
git commit -m "feat: add pin and delete buttons to discussion list cards"
```

---

### Task 10: 端到端验证

- [ ] **Step 1: 启动后端并验证 API**

```bash
cd server && npx tsx src/index.ts
```

测试：
```bash
# 删除
curl -X DELETE http://localhost:3001/api/discussions/<id>
# 置顶
curl -X PATCH http://localhost:3001/api/discussions/<id>/pin -H 'Content-Type: application/json' -d '{"pinned":true}'
# 取消置顶
curl -X PATCH http://localhost:3001/api/discussions/<id>/pin -H 'Content-Type: application/json' -d '{"pinned":false}'
# 列表排序
curl http://localhost:3001/api/discussions
```

- [ ] **Step 2: 启动前端并验证 UI**

```bash
cd client && npx vite
```

验证清单：
- [ ] 卡片 hover 时右下角出现置顶和删除按钮
- [ ] 点击置顶 → 讨论移到列表顶部 → 置顶图标高亮
- [ ] 点击删除 → 弹出确认对话框 → 显示讨论主题名
- [ ] 确认删除 → 讨论从列表移除
- [ ] 取消删除 → 对话框关闭
- [ ] 删除活跃讨论 → 自动取消选中状态

- [ ] **Step 3: 验证流式输出**

进入一个 live 讨论，观察：
- [ ] 发言文本逐 token 出现（非一次性显示）
- [ ] 输出连贯，无截断或乱序
- [ ] 发言完成后正常进入下一轮

- [ ] **Step 4: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: E2E verification fixes"
```
