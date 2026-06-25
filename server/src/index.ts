import express from 'express'
import cors from 'cors'
import { initDb, seedDb } from './db/index.js'
import discussionsRouter from './routes/discussions.js'

// Load .env manually
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

try {
  const envPath = resolve(__dirname, '../.env')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const value = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
  console.log('[Server] 环境变量已加载')
} catch {
  console.log('[Server] 未找到 .env 文件，使用系统环境变量')
}

const PORT = parseInt(process.env.PORT || '3001', 10)

async function main() {
  // Init database
  await initDb()
  await seedDb()

  const app = express()

  // CORS for Vite dev server
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }))
  app.use(express.json())

  // Debug logging middleware
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
  })

  // Routes
  app.use('/api/discussions', discussionsRouter)

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.listen(PORT, () => {
    console.log(`[Server] AI Panel Studio 后端已启动: http://localhost:${PORT}`)
    console.log(`[Server] DEEPSEEK_API_KEY ${process.env.DEEPSEEK_API_KEY ? '已配置' : '⚠️ 未配置'}`)
  })
}

main().catch(err => {
  console.error('[Server] 启动失败:', err)
  process.exit(1)
})
