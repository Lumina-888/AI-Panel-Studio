# Task 7 Report: Add deleteDiscussion and togglePin to appStore

## Changes Made

**File modified:** `client/src/stores/appStore.ts`

1. **AppState interface** (lines 19-21): Added two async method signatures:
   - `deleteDiscussion: (id: string) => Promise<void>`
   - `togglePin: (id: string, pinned: boolean) => Promise<void>`

2. **Store creator** (line 24): Updated from `(set)` to `(set, get)` to allow `togglePin` to call `fetchDiscussions` on the store.

3. **deleteDiscussion implementation** (lines 56-61): Sends `DELETE /api/discussions/:id`, then removes the discussion from local state via `set`; also clears `activeDiscussionId` if the deleted discussion was active.

4. **togglePin implementation** (lines 64-72): Sends `PATCH /api/discussions/:id/pin` with `{ pinned }` payload, then refetches the full discussion list via `get().fetchDiscussions()` to get correct sort order from the server.

## Verification

- TypeScript check: `npx tsc --noEmit` reports no errors in `appStore.ts`. (The only pre-existing error is in `discussionStore.ts`.)

## Commit

```
211b32e feat: add deleteDiscussion and togglePin to appStore
```
