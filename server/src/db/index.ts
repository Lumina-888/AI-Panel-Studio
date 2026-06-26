import initSqlJs, { SqlJsStatic, Database as SqlJsDb } from 'sql.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let SQL: SqlJsStatic | null = null
let db: SqlJsDb | null = null
let dbPath: string | null = null

// Debounce state for saveToDisk
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let pendingSave = false
const SAVE_DEBOUNCE_MS = 500

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function saveToDisk(): void {
  // Cancel any pending debounced save
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
    pendingSave = false
  }
  if (db && dbPath) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

function scheduleSave(): void {
  if (pendingSave) return
  pendingSave = true
  saveTimeout = setTimeout(() => {
    try {
      if (db && dbPath) {
        const data = db.export()
        fs.writeFileSync(dbPath, Buffer.from(data))
      }
    } catch (err) {
      console.error('[DB] scheduleSave 写入失败:', (err as Error).message)
    } finally {
      pendingSave = false
      saveTimeout = null
    }
  }, SAVE_DEBOUNCE_MS)
}

export async function getDb(dbPathOverride?: string): Promise<SqlJsDb> {
  if (!db) {
    if (!SQL) {
      SQL = await initSqlJs()
    }
    dbPath = dbPathOverride || path.resolve(__dirname, '../../data/panel.db')
    ensureDir(dbPath)

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
    } else {
      db = new SQL.Database()
    }
    db.run('PRAGMA foreign_keys = ON')
  }
  return db
}

export async function closeDb(): Promise<void> {
  if (db) {
    saveToDisk()
    db.close()
    db = null
  }
}

// Helper to run a query that returns rows (mimics better-sqlite3 .all())
export function queryAll(database: SqlJsDb, sql: string, params: any[] = []): any[] {
  const stmt = database.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// Helper to run a query that returns one row (mimics better-sqlite3 .get())
export function queryOne(database: SqlJsDb, sql: string, params: any[] = []): any | undefined {
  const rows = queryAll(database, sql, params)
  return rows.length > 0 ? rows[0] : undefined
}

// Helper to run an INSERT/UPDATE/DELETE (mimics better-sqlite3 .run())
export function execute(database: SqlJsDb, sql: string, params: any[] = []): void {
  database.run(sql, params)
  scheduleSave()
}

// Multi-statement exec — 使用 exec() 执行全部语句（run() 只执行第一条）
export function execSql(database: SqlJsDb, sql: string): void {
  database.exec(sql)
  scheduleSave()
}

export async function initDb(): Promise<void> {
  const database = await getDb()
  const migrationPath = path.resolve(__dirname, '../../migrations/init.sql')
  if (fs.existsSync(migrationPath)) {
    const migration = fs.readFileSync(migrationPath, 'utf-8')
    // Split by semicolons, filter empty
    const statements = migration.split(';').filter(s => s.trim().length > 0)
    for (const stmt of statements) {
      // 去除开头的 SQL 注释行（如 -- v2: xxx）
      let trimmed = stmt.trim()
      while (trimmed.startsWith('--')) {
        const newlineIdx = trimmed.indexOf('\n')
        if (newlineIdx === -1) {
          trimmed = '' // 整段都是注释
          break
        }
        trimmed = trimmed.slice(newlineIdx + 1).trim()
      }
      if (!trimmed) continue
      const upperStmt = trimmed.toUpperCase()

      if (upperStmt.startsWith('ALTER TABLE')) {
        // 幂等处理 ALTER TABLE：捕获 "duplicate column" 错误
        try {
          database.run(stmt + ';')
        } catch (e: any) {
          if (e.message?.includes('duplicate column')) {
            console.log('[DB] ALTER TABLE 已执行过，跳过:', trimmed.slice(0, 60))
          } else {
            throw e
          }
        }
      } else if (upperStmt.startsWith('CREATE TABLE') || upperStmt.startsWith('CREATE INDEX')) {
        // IF NOT EXISTS 已保证幂等
        database.run(stmt + ';')
      } else if (upperStmt.length > 0) {
        // 未知语句类型 — 执行并报告错误（不静默吞掉）
        try {
          database.run(stmt + ';')
        } catch (e) {
          console.error('[DB] Migration statement failed:', (e as Error).message)
          throw e
        }
      }
    }
    saveToDisk()
    console.log('[DB] 数据库初始化完成')
  } else {
    console.error('[DB] 找不到迁移文件:', migrationPath)
  }
}

export async function seedDb(): Promise<void> {
  const database = await getDb()
  const seedPath = path.resolve(__dirname, '../../seeds/seed.sql')
  if (fs.existsSync(seedPath)) {
    const result = queryOne(database, 'SELECT COUNT(*) AS cnt FROM discussions')
    const count = (result as any)?.cnt || 0
    if (count > 0) {
      console.log(`[DB] 数据库已有 ${count} 条讨论，跳过种子数据`)
      return
    }
    const seed = fs.readFileSync(seedPath, 'utf-8')
    execSql(database, seed)
    console.log('[DB] 种子数据添加完成')
  }
}

// Get the raw Database instance for backwards compatibility
export { initSqlJs }
export type { SqlJsDb }
