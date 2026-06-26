# Final Code Review: 讨论删除/置顶 + 流式输出

**Date:** 2026-06-26
**Reviewer:** Claude Code (Final Review)
**Commits reviewed:** 9 commits (40592a7 through 77fafe2), 10 changed files

---

## 1. Overall Assessment

**Verdict: NEEDS FIXES (1 critical bug found)**

The streaming and delete features are architecturally sound, but the pin feature is completely broken on the frontend due to a missing field mapping. One fix required before merge; no data-loss risk.

---

## 2. Critical Issues

### 2.1 `fetchDiscussions` drops `pinned_at` — PIN FEATURE BROKEN

**File:** `client/src/stores/appStore.ts`, lines 34-42

```typescript
const discussions = list.map((d: any) => ({
  id: d.id,
  topic: d.topic,
  expert_count: d.expert_count,
  status: d.status,
  created_at: d.created_at,
  panelist_count: d.panelists?.length ?? 0,
  message_count: d.messages?.length ?? 0,
  // BUG: pinned_at is NOT mapped
}))
```

The backend `GET /api/discussions` returns `pinned_at` (it's in `DiscussionRow` and spread via `{ ...d, panelists }`), but the frontend mapping drops it. Since `DiscussionSummary extends Discussion` requires `pinned_at: string | null`, the field is `undefined` at runtime.

**Impact:**
- `d.pinned_at` in `DiscussionList` is always falsy -- pin icon never renders
- `togglePin(d.id, !d.pinned_at)` evaluates to `togglePin(id, true)` ALWAYS -- can only pin, never unpin
- Re-fetch after pin toggle drops `pinned_at` again, so the UI never reflects the pinned state

**Fix:**
```typescript
pinned_at: d.pinned_at ?? null,
```

---

## 3. Important Issues

### 3.1 Deleting active discussion does not navigate away

**File:** `client/src/stores/appStore.ts`, lines 56-61; `client/src/components/discussion/DiscussionList.tsx`, line 24-28

The design spec states "删除活跃讨论后跳回首页". `deleteDiscussion` clears `activeDiscussionId`, but neither it nor `handleDelete` calls `navigate('/')`. The URL stays at `/discussion/<deleted-id>`, the main area continues trying to render the discussion view, and `AppLayout` (which uses `useParams` not `activeDiscussionId`) still treats the route as `isRoom = true`.

**Fix:** After confirming deletion of the active discussion, call `navigate('/')` in `handleDelete`:
```typescript
const handleDelete = async () => {
  if (!deleteTarget) return
  const wasActive = deleteTarget.id === activeDiscussionId
  await deleteDiscussion(deleteTarget.id)
  setDeleteTarget(null)
  if (wasActive) navigate('/')
}
```

### 3.2 `SchedulingDecision` type is dead code

**File:** `server/src/types/index.ts`, lines 92-96

```typescript
export interface SchedulingDecision {
  panelist_id: string
  type: MessageType
  content: string  // no longer returned by decideNextSpeaker
}
```

This type is not imported or used anywhere in the codebase. It reflects the old return shape of `decideNextSpeaker` (which included `content`). Keeping it is misleading and violates the "clean up orphans" principle.

**Fix:** Delete the `SchedulingDecision` interface.

### 3.3 `confirm` and `start` endpoints pass `name: ''` in SchedulingContext to `decideNextSpeaker`

**Files:** `server/src/routes/discussions.ts`, lines 201, 280

```typescript
messages: messages.map(m => ({ panelist_id: m.panelist_id, name: '', content: m.content, type: m.type })),
```

The `next-step` endpoint and SSE loop both properly populate the name via `panelistNameMap`/`nameMap` in the SchedulingContext passed to `decideNextSpeaker`. But `confirm` and `start` pass empty string, then build `panelistNameMap` later only for `generateSpeechContent`.

This means the scheduling prompt sees message history like `[](:statement): ...` instead of `[张教授](statement): ...`. The LLM receives degraded context for its scheduling decision.

**Fix:** Build `panelistNameMap` BEFORE calling `decideNextSpeaker` in `confirm` and `start`, matching the pattern in `next-step`:
```typescript
const panelistNameMap: Record<string, string> = {}
for (const p of panelists) panelistNameMap[p.id] = p.name

const decision = await decideNextSpeaker(
  {
    topic: discussion.topic,
    panelists: panelists.map(p => ({ ... })),
    messages: messages.map(m => ({ panelist_id: m.panelist_id, name: panelistNameMap[m.panelist_id] || '', content: m.content, type: m.type })),
  },
  llm
)
```

### 3.4 Significant code duplication across confirm/start/next-step

**File:** `server/src/routes/discussions.ts`

All three endpoints share an identical 20-line pattern:
```
decideNextSpeaker → INSERT placeholder → UPDATE panelist status → INSERT status log → generateSpeechContent → UPDATE content
```

`confirm` and `start` are essentially identical (the only difference is log messages). `next-step` adds consensus extraction and end-detection. Combined with issue 3.3, this duplication leads to copy-paste inconsistencies.

**Fix:** Extract a shared helper:
```typescript
async function generateNextMessage(
  db: Database,
  discussionId: string,
  discussion: DiscussionRow,
  panelists: PanelistRow[],
  messages: MessageRow[],
  llm: LLMClient
): Promise<{ decision: Awaited<ReturnType<typeof decideNextSpeaker>>; speechContent: string; msgId: string; nextSeq: number }> {
  // shared logic here
}
```

---

## 4. Minor Issues

### 4.1 Placeholder message hardcodes `type: 'statement'`

**File:** `client/src/stores/discussionStore.ts`, line 153

```typescript
const placeholder: Message = {
  ...
  type: 'statement',  // should be 'opening', 'closing', 'rebuttal', etc.
  ...
}
```

When `message_token` arrives before the placeholder exists (race condition), the created placeholder always has `type: 'statement'`. This is later fixed by `addMessage` when `transcript_message` arrives, so the impact is brief visual inconsistency during streaming. Low priority.

### 4.2 `PanelistStatusEvent.focus` type mismatch (pre-existing)

**File:** `client/src/types/index.ts`, lines 73-77

```typescript
export interface PanelistStatusEvent {
  panelist_id: string
  status: PanelistStatus
  focus: string  // backend sends string | null
}
```

Not introduced by this PR, but worth fixing while touching SSE types.

### 4.3 `fetchDiscussions` redundant `finally` clause (pre-existing)

**File:** `client/src/stores/appStore.ts`, lines 43-46

```typescript
set({ discussions, loading: false })  // try block
} finally {
  set({ loading: false })             // always runs, redundant on success
}
```

Not a bug, but adds an unnecessary state update on the success path.

### 4.4 Duplicate SchedulingContext construction in SSE loop

**File:** `server/src/routes/discussions.ts`, lines 538-546 and 581-588

The same `SchedulingContext` object (with `topic`, `panelists`, `messages`) is constructed twice per iteration — once for `decideNextSpeaker` and once for `generateSpeechStream`. Could be built once and reused since the context is identical.

---

## 5. Strengths

- **Clean architecture separation:** Splitting `decideNextSpeaker` (scheduling decision, non-streaming) from `generateSpeechStream` (content generation, streaming) is well-designed. Each function has a single responsibility.

- **Robust SSE error handling:** The streaming loop properly handles failures:
  - Abort check after every async operation
  - `try/catch` around stream generation with fallback message `（发言生成失败）`
  - Partial content preserved if streaming fails mid-way
  - Socket close properly sets `aborted` flag and all code paths respect it

- **Proper cascade delete:** All child tables have `ON DELETE CASCADE` referencing `discussions(id)`. The DELETE endpoint is a single `DELETE FROM discussions` with no manual cleanup needed. Correct.

- **Pinned_at toggle logic:** `datetime('now')` on pin, `NULL` on unpin — clean and correct. Multiple pins supported naturally via `pinned_at DESC` ordering.

- **Streaming placeholder replacement:** `addMessage` finds the placeholder by `seq + id.startsWith('streaming-')` and replaces it in-place, avoiding message duplication or ordering issues. `appendMessageToken` creates placeholders on-demand if tokens arrive before the DB insert propagates. The final `transcript_message` serves as the authoritative replacement.

- **DiscussionList UX:** Confirmation modal with topic preview, proper backdrop overlay, escape via close button or cancel — covers the essential interaction patterns. Hover-reveal buttons keep the list clean.

- **All SchedulingContext constructions now include `title` and `stance`:** The expanded context enables the speech generation prompt to produce role-appropriate, stance-aware dialog. This is critical for the streaming quality.

- **SSE event types consistent:** `message_token` event format matches between backend `sendEvent` and frontend `addEventListener` — same three fields (`panelist_id`, `token`, `seq`).

---

## 6. Summary

| Category | Count |
|----------|-------|
| Critical | 1 |
| Important | 3 |
| Minor | 4 |

**Required before merge:** Fix issue 2.1 (missing `pinned_at` in `fetchDiscussions`).
**Recommended before merge:** Fix issues 3.1 (navigation after delete), 3.3 (name in SchedulingContext).
**Optional:** Issues 3.2, 3.4, 4.1-4.4.
