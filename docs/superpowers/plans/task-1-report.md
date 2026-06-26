# Task 1 Report: Add `pinned_at` Column to Discussions

## Status
**DONE**

## Commits
- `c3c2f62` — schema: add pinned_at column to discussions

## Changes Made
- Appended `ALTER TABLE discussions ADD COLUMN pinned_at TIMESTAMP;` to `server/migrations/init.sql` (line 65, after the `-- v2: 讨论置顶` comment). No existing lines were modified.

## Verification Output
```
[DB] 数据库初始化完成
columns: ['id', 'topic', 'expert_count', 'status', 'created_at', 'pinned', 'pinned_at']
```

The `pinned_at` column appears in the `discussions` table column list as expected.

## Concerns
None. The `initDb()` function in `server/src/db/index.ts` catches errors during statement execution, so if the column already exists on an older database, the migration will log a warning and continue without crashing.
