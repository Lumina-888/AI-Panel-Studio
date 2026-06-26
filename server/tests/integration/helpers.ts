import express from 'express'
import cors from 'cors'
import path from 'path'
import os from 'os'
import { getDb, closeDb, initDb } from '../../src/db/index.js'
import discussionsRouter from '../../src/routes/discussions.js'
import { MockLLMClient } from '../setup.js'

// ===== Mock LLM 实例 =====
// 测试文件通过 vi.mock 劫持 createLLMClient 返回此实例。
// 每个测试前需要清空队列并注入预期响应。
export const mockLLM = new MockLLMClient()

// 临时数据库路径（每次测试运行唯一）
let testDbPath: string | null = null

/**
 * 创建测试用 Express App。
 * - 每次调用重建 DB（closeDb → getDb(new path) → initDb）
 * - 注入 mock DEEPSEEK_API_KEY
 */
export async function createTestApp(): Promise<express.Express> {
  process.env.DEEPSEEK_API_KEY = 'test-mock-key'

  // 关闭旧连接
  await closeDb()

  // 新临时路径
  testDbPath = path.join(
    os.tmpdir(),
    `ai-panel-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`
  )

  // 初始化空数据库
  const db = await getDb(testDbPath)

  // 手动跑迁移 SQL（initDb 依赖文件系统路径，直接执行语句更可靠）
  const migration = `
    CREATE TABLE IF NOT EXISTS discussions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        expert_count INTEGER NOT NULL DEFAULT 4,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','live','ended')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        pinned_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS panelists (
        id TEXT PRIMARY KEY,
        discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('host','expert')),
        title TEXT NOT NULL,
        stance TEXT NOT NULL,
        color TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'standby' CHECK(status IN ('standby','preparing','speaking')),
        focus TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        panelist_id TEXT NOT NULL REFERENCES panelists(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('opening','statement','rebuttal','supplement','closing')),
        seq INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS consensus_points (
        id TEXT PRIMARY KEY,
        discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.5 CHECK(confidence >= 0 AND confidence <= 1),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS divergence_points (
        id TEXT PRIMARY KEY,
        discussion_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        perspectives TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS panelist_status_logs (
        id TEXT PRIMARY KEY,
        panelist_id TEXT NOT NULL REFERENCES panelists(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('standby','preparing','speaking')),
        focus TEXT,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `

  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const stmt of statements) {
    try {
      db.run(stmt + ';')
    } catch {
      // 忽略 "already exists" 错误
    }
  }

  // 同时运行 initDb（处理磁盘持久化）
  try {
    await initDb()
  } catch {
    // migration 可能已存在
  }

  const app = express()
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }))
  app.use(express.json())
  app.use('/api/discussions', discussionsRouter)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  return app
}

/** 清理：关闭 DB，删除临时文件 */
export async function cleanupTestDb(): Promise<void> {
  await closeDb()
  if (testDbPath) {
    try {
      const fs = await import('fs')
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath)
      }
    } catch {
      // 忽略清理错误
    }
    testDbPath = null
  }
}

/** 清空所有表数据（保留 schema） */
export async function clearAllTables(): Promise<void> {
  try {
    const db = await getDb()
    db.run('DELETE FROM panelist_status_logs')
    db.run('DELETE FROM divergence_points')
    db.run('DELETE FROM consensus_points')
    db.run('DELETE FROM messages')
    db.run('DELETE FROM panelists')
    db.run('DELETE FROM discussions')
  } catch {
    // DB 未初始化
  }
}

/** 清空 mock LLM 响应队列 */
export function resetMockLLM(): void {
  mockLLM.reset()
}

// ===== 便捷 Mock 注入函数 =====

/** 注入嘉宾生成的 mock 响应 */
export function mockGeneratePanelists(panelists: Array<{
  name: string
  role: string
  title: string
  stance: string
  color: string
}>): void {
  mockLLM.addResponse({ panelists })
}

/** 注入发言调度的 mock 响应（panelistId 需匹配实际 DB ID） */
export function mockDecideNextSpeaker(panelistId: string, type: string): void {
  mockLLM.addResponse({ panelist_id: panelistId, type })
}

/** 注入流式发言内容的 mock token 序列 */
export function mockSpeechStream(tokens: string[]): void {
  mockLLM.addStreamTokens(tokens)
}
