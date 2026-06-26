# Task 4 Report: Split Scheduling Decision from Speech Content Generation

## Status: Complete

## Changes Made

File modified: `server/src/services/discussion.ts`

### 1. SchedulingResponseSchema (line 9-12)
Removed `content` field from the Zod schema. The scheduler now only validates `panelist_id` and `type`.

### 2. buildSystemPrompt (line 26-27)
Updated the last line of the scheduling prompt to instruct the LLM to only make scheduling decisions without generating speech content. Removed `"content": "发言内容"` from the expected JSON.

### 3. parseResponse (lines 66-94)
- Return type changed from `{ panelist_id: string; type: MessageType; content: string }` to `{ panelist_id: string; type: MessageType }`
- Removed `content` from destructuring of `result.data`
- Removed `content` from the return object

### 4. decideNextSpeaker (lines 106-127)
- Return type changed from `Promise<{ panelist_id: string; type: MessageType; content: string }>` to `Promise<{ panelist_id: string; type: MessageType }>`

### 5. New Streaming Speech Functions (lines 129-203)
Three new functions and two internal helpers appended:

- `buildSpeechSystemPrompt()` — System prompt instructing the LLM to role-play as a panelist and output speech content only
- `buildSpeechUserPrompt(ctx, decision)` — User prompt providing panelist identity (name, role, title, stance), speech type hint, and recent discussion history
- `generateSpeechStream(ctx, decision, llm)` — Async generator that streams speech tokens via `llm.streamChat()`
- `generateSpeechContent(ctx, decision, llm)` — Convenience wrapper that collects all tokens from `generateSpeechStream` into a single string

## Architecture Impact

The scheduling and content generation concerns are now fully separated:
- `decideNextSpeaker()` — Decides WHO speaks and WHAT TYPE of speech (opening/statement/rebuttal/supplement/closing)
- `generateSpeechStream()` / `generateSpeechContent()` — Generates the actual speech content for a given scheduling decision

This enables downstream code to:
- Stream speech content token-by-token to the frontend via SSE
- Use the convenience wrapper for non-streaming scenarios

## Verification

- `npx tsc --noEmit` — Zero errors in `discussion.ts`
- Errors in `routes/discussions.ts` are expected (routes still use old `content` property on scheduling result — will be fixed in a later task)

## Commit

```
51a5122 feat: split scheduling decision from speech content generation with streaming
```
