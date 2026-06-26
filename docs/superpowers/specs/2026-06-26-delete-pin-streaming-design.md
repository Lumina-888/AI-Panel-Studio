# Design Spec: 讨论删除/置顶 + 专家流式输出

**日期:** 2026-06-26  
**状态:** 已确认

---

## 概述

两个独立功能：
1. 讨论列表增加删除和置顶（允许多条置顶）
2. 专家发言改为流式输出（token-by-token）

---

## 一、数据库变更

### `discussions` 表新增列

```sql
ALTER TABLE discussions ADD COLUMN pinned_at TIMESTAMP;
-- NULL = 未置顶，非 NULL = 置顶时间
```

同步更新 `server/migrations/init.sql`。

---

## 二、后端 API

### 2.1 新增端点

#### `DELETE /api/discussions/:id`

级联删除讨论及其关联数据：
- panelists
- messages  
- consensus_points
- divergence_points
- panelist_status_logs

返回：`200 { success: true }`，不存在返回 `404`。

#### `PATCH /api/discussions/:id/pin`

请求体：`{ pinned: boolean }`
- `true` → 设 `pinned_at = datetime('now')`
- `false` → 设 `pinned_at = NULL`

返回：更新后的 discussion 对象。

### 2.2 修改端点

#### `GET /api/discussions` — 排序变更

```sql
ORDER BY pinned_at IS NOT NULL DESC, pinned_at DESC, created_at DESC
```

置顶的在前（按置顶时间倒序），未置顶的在后（按创建时间倒序）。

### 2.3 流式输出改造

**核心思路：** 将当前 `decideNextSpeaker()` 拆为两步 —— 调度决策（非流式）+ 内容生成（流式）。

#### `server/src/services/llm.ts` — 新增

```typescript
async function* streamChat(messages: ChatMessage[]): AsyncGenerator<string>
```

调用 DeepSeek API (`stream: true`)，yield 每个 content delta token。

#### `server/src/services/discussion.ts` — 修改

- `decideNextSpeaker()` — prompt 改为只返回 `{ panelist_id, type }`，不含 content
- 新增 `generateSpeechStream()` — 接收讨论上下文 + panelist 信息，调用 `streamChat()`，yield token

#### SSE 循环 (`GET /api/discussions/:id/stream`) — 改造

```
decideNextSpeaker()                          → { panelist_id, type }
  ↓
写入占位 message 行（content = ''）
  ↓
发送 panelist_status 事件（status: 'speaking'）
  ↓
for await (token of generateSpeechStream()):
  发送 message_token 事件 { panelist_id, token, seq }
  ↓
更新 message.content = 完整文本
  ↓
发送 transcript_message 事件（完整 message）
  ↓
consensus/divergence 提取逻辑不变
```

#### 新增 SSE 事件类型：`message_token`

```json
{
  "panelist_id": "uuid",
  "token": "这是",
  "seq": 3
}
```

#### `POST /api/discussions/:id/next-step` — 同步适配

同样拆为两步，但 `generateSpeechStream()` 的结果在服务端收集完毕后再返回完整 message（REST 响应不支持流式）。

---

## 三、前端

### 3.1 类型定义 (`client/src/types/index.ts`)

新增：
```typescript
interface MessageTokenEvent {
  panelist_id: string;
  token: string;
  seq: number;
}
```

### 3.2 `appStore.ts` — 新增 action

- `deleteDiscussion(id)` — `DELETE /api/discussions/:id` → 从 discussions 移除 → 若 `activeDiscussionId === id` 则置 null
- `togglePin(id, pinned)` — `PATCH /api/discussions/:id/pin` → 刷新列表
- `fetchDiscussions()` — 无变化，后端已排序

### 3.3 `discussionStore.ts` — 流式接收

新增 `message_token` 事件处理：
- 收 token → 若 messages 中已有该 seq 的占位 message，追加 token 到其 content；若无，创建占位 message（content 初始为该 token）
- `transcript_message` 事件 — 使用完整 content 替换对应 seq 的 message（最终一致性保证）

新增 action：
- `appendMessageToken(panelist_id, token, seq)` — 逐 token 追加

### 3.4 `DiscussionList.tsx` — 卡片按钮

每张卡片右下角增加：
- **置顶按钮（📌）** — 已置顶时图标实心高亮，点击切换
- **删除按钮（🗑）** — hover 时红色，点击弹出确认对话框

确认对话框：标题"确认删除"，显示讨论主题名，确认/取消两个按钮，确认后执行删除。

### 3.5 `TranscriptView.tsx`

无需改动。Zustand state 更新驱动重渲染，文本自然逐 token 增长，现有 auto-scroll 自动跟随。

---

## 四、改动文件清单

| 文件 | 改动类型 |
|------|----------|
| `server/migrations/init.sql` | 新增 pinned_at 列 |
| `server/src/services/llm.ts` | 新增 `streamChat()` 方法 |
| `server/src/services/discussion.ts` | 拆分 `decideNextSpeaker()` + 新增 `generateSpeechStream()` |
| `server/src/routes/discussions.ts` | 新增 DELETE/PATCH 端点 + SSE 循环改造 + 排序修改 |
| `client/src/types/index.ts` | 新增 `MessageTokenEvent` |
| `client/src/stores/appStore.ts` | 新增 `deleteDiscussion`、`togglePin` |
| `client/src/stores/discussionStore.ts` | 新增 `message_token` 监听 + `appendMessageToken` |
| `client/src/components/discussion/DiscussionList.tsx` | 新增置顶/删除按钮 + 确认对话框 |

---

## 五、边界情况

- 删除正在 SSE 连接中的讨论：断开 SSE → 删除数据 → 导航回首页
- 置顶已置顶的讨论：取消置顶（toggle 行为）
- 流式生成中途断连：`req.on('close')` 触发 `aborted = true`，停止生成
- 流式 token 到达但占位 message 还未创建：前端创建占位 message
- `next-step` REST 端点：收集全部 token 后返回完整 message（无流式）
