# Task 4 Review: Split Scheduling Decision from Speech Content Generation

## Spec Compliance: PASS

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | SchedulingResponseSchema: `content` field removed | PASS | Line 9-12, only `panelist_id` + `type` remain |
| 2 | buildSystemPrompt: last line changed, content removed from JSON | PASS | Lines 26-27 match spec |
| 3 | parseResponse: return type `{ panelist_id, type }` without content | PASS | Lines 66-94, destructuring and return match |
| 4 | decideNextSpeaker: `Promise<{ panelist_id: string; type: MessageType }>` | PASS | Lines 106-109 |
| 5 | buildSpeechSystemPrompt: Chinese prompt for in-character speech | PASS | Lines 131-139 |
| 6 | buildSpeechUserPrompt: uses `panelist.title`, `panelist.stance`, typeHint map | PASS | Lines 142-176 |
| 7 | generateSpeechStream: async generator via `llm.streamChat()`, yields tokens | PASS | Lines 178-191 |
| 8 | generateSpeechContent: collects tokens from stream, returns full string | PASS | Lines 193-203 |
| 9 | No new imports needed | PASS | `ValidationError` already imported at line 3 |
| 10 | TypeScript: discussion.ts has no errors | PASS | `tsc --noEmit` confirms zero errors in this file |
| 11 | Commit message matches spec | PASS | `51a5122 feat: split scheduling decision from speech content generation with streaming` |

### Minor Deviation

`buildSystemPrompt()` line 23 still contains the old rule 6 "每位发言控制在 1-2 句话（约 50-150 字）", which the plan spec removed from the scheduling prompt (the spec showed 6 rules, not 7). This rule is now more relevant to the speech-generation path than the scheduling path. Impact is negligible — scheduling behavior is unaffected since the prompt change that matters (no `content` in JSON) is correct.

## Code Quality: PASS

| # | Criterion | Status | Notes |
|---|---|---|---|
| 1 | Content logic removal is clean | PASS | No dead references to `content` remain in schema, parseResponse, or decideNextSpeaker |
| 2 | Error handling: panelist not found | PASS | `buildSpeechUserPrompt` line 147 throws `ValidationError` correctly |
| 3 | Streaming logic correct | PASS | `async function*` with `for-await-of` + `yield`, proper `AsyncGenerator<string>` return type |
| 4 | Prompt quality | PASS | Both prompts are clear, well-structured Chinese with concrete constraints |
| 5 | No unnecessary abstractions | PASS | Two internal helpers + two exported functions, minimal and direct |

## Verdict

**Spec Compliance:** PASS
**Task Quality:** Approved
**Issues:** None blocking. One minor style note — `buildSystemPrompt()` retained the word-count rule that the plan spec moved to the speech-generation path, but this has no functional impact on scheduling correctness.

## Context

All 10 TypeScript errors reported by `tsc --noEmit` are in `server/src/routes/discussions.ts` (callers accessing `.content` on the old scheduling result shape). These are expected and will be resolved in Task 5 (routes update).
