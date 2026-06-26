# Fix Stalled Discussion Flow — Implementation Plan

## Context

创建讨论后进入 DiscussionRoom，TranscriptView 一直显示 **"等待主持人开场..."**，讨论无法进行。根本原因是三个串联 bug：

1. **前端丢弃 API 返回的 messages** — `fetchDiscussion` 调用了 `GET /api/discussions/:id`（已返回 messages），但 store 只保存了 `discussion` 和 `panelists`，丢掉了 messages
2. **后端无 SSE 端点** — 前端 `connectSSE` 请求 `GET /api/discussions/:id/stream`，返回 404
3. **无自动推进机制** — `/confirm` 只生成第一条消息（主持人开场），后续消息需手动调用 `/next-step`，无人调用

附带问题：`GET /api/discussions/:id` 返回的 messages 缺少 `name`/`title`/`color`（需从 panelist join），appStore 的 `fetchDiscussions` 也无法正确解析后端返回的讨论列表。

---

## 修改文件清单

### 1. `server/src/routes/discussions.ts`（核心改动）

**a) 添加 `enrichMessages` 工具函数**
```typescript
function enrichMessages(messages: MessageRow[], panelistMap: Record<string, PanelistRow>) {
  return messages.map(m => ({
    ...m,
    name: panelistMap[m.panelist_id]?.name ?? '未知',
    title: panelistMap[m.panelist_id]?.title ?? '',
    color: panelistMap[m.panelist_id]?.color ?? '#888888',
  }))
}
```

**b) `GET /:id` — 用 `enrichMessages` 包裹返回的 messages**
在 `GET /:id` 处理函数中构建 `panelistMap`，将 `messages` 替换为 `enrichMessages(messages, panelistMap)`

**c) `POST /:id/confirm` — 同样 enrich 返回的 messages**
在确认讨论返回前加入 `panelistMap` 构建和 message enrichment

**d) `POST /:id/start` — 同样 enrich 返回的 messages**

**e) `POST /:id/next-step` — enrich messages + 修复 stale panelists**
响应中 `panelists` 使用的是更新前的旧值，改为重新查询

**f) 新增 `GET /:id/stream` — SSE 实时讨论流**
- 验证讨论状态（需为 `live`）
- 设置 SSE headers
- `req.on('close')` 监听断连，设置 `aborted` 标志
- 先发送已有的 messages（enriched）作为初始事件
- 进入循环：
  1. `decideNextSpeaker()` → 生成下一条发言
  2. 写入 messages 表，更新 panelist 状态
  3. 发送 `transcript_message` + `panelist_status` SSE 事件
  4. 每 ≥4 条消息后调用 `extractConsensus()`，发送 `consensus_update`/`divergence_update`
  5. 检测结束条件（`type === 'closing'` 或 `seq >= 15`），发送 `discussion_end`
- 异常时发送 `error` 事件

### 2. `client/src/stores/discussionStore.ts`

**a) `fetchDiscussion` — 保存 messages/consensus/divergence**
在 `set()` 调用中添加：
```typescript
messages: data.messages || [],
consensusPoints: data.consensus || [],
divergencePoints: data.divergence || [],
```

**b) `addMessage` — 添加去重逻辑**
```typescript
addMessage: (msg) =>
  set((s) => {
    if (s.messages.some(m => m.id === msg.id)) return s
    return { messages: [...s.messages, msg] }
  }),
```
防止 SSE 初始事件与 `fetchDiscussion` 加载的数据重复。

### 3. `client/src/stores/appStore.ts`

**a) `fetchDiscussions` — 适配后端返回格式**
后端 `GET /api/discussions` 直接返回数组，但前端 `DiscussionSummary` 需要 `panelist_count` 和 `message_count`。改为：
```typescript
const data = await res.json()
const list = Array.isArray(data) ? data : (data.discussions || [])
const discussions = list.map((d: any) => ({
  id: d.id,
  topic: d.topic,
  expert_count: d.expert_count,
  status: d.status,
  created_at: d.created_at,
  panelist_count: d.panelists?.length ?? 0,
  message_count: d.messages?.length ?? 0,
}))
set({ discussions, loading: false })
```

---

## 不改动的文件

以下文件和函数工作正常，无需修改：
- `server/src/services/discussion.ts` (decideNextSpeaker)
- `server/src/services/consensus.ts` (extractConsensus)
- `server/src/services/llm.ts` (createLLMClient)
- `server/src/services/panelist.ts` (generatePanelists)
- `server/src/db/index.ts`
- `server/src/index.ts`（路由已挂载在 `/api/discussions` 下）
- `client/src/components/discussion/DiscussionRoom.tsx`
- `client/src/components/transcript/TranscriptView.tsx`
- `client/src/components/panelist/PanelistSidebar.tsx`
- `client/src/components/consensus/ConsensusDivergencePanel.tsx`
- `client/src/types/index.ts`
- `server/src/types/index.ts`

---

## 实施顺序

| # | 文件 | 改动 | 可验证性 |
|---|------|------|---------|
| 1 | server routes | enrichMessages + 修复 GET /:id | curl GET /:id，确认 messages 含 name/title/color |
| 2 | client discussionStore | fetchDiscussion 保存 messages + addMessage 去重 | 确认讨论后 TranscriptView 显示第一条消息 |
| 3 | server routes | 新增 GET /:id/stream SSE 端点 | SSE 连接触发自动讨论推进 |
| 4 | client appStore | 修复 fetchDiscussions | 讨论列表正确展示 |
| 5 | server routes | 修复 confirm/start/next-step 的 message enrichment + stale panelists | 手动调用返回正确数据 |

---

## 验证方式

1. 重启后端和前端
2. 创建新讨论 → 确认 → 导航到 DiscussionRoom
3. **关键验证**：TranscriptView 应立即显示主持人开场白（不再显示"等待主持人开场..."）
4. 后续发言应通过 SSE 自动流式出现
5. 专家状态面板实时更新
6. ≥4 条发言后出现共识/分歧
7. 15 条发言或主持人总结后讨论自动结束
