import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb, queryAll, queryOne, execute } from '../db/index.js'
import { createLLMClient } from '../services/llm.js'
import { generatePanelists } from '../services/panelist.js'
import { decideNextSpeaker } from '../services/discussion.js'
import { extractConsensus } from '../services/consensus.js'
import type { DiscussionRow, PanelistRow, MessageRow, ConsensusRow, DivergenceRow } from '../types/index.js'

const router = Router()

// 工具函数：将 MessageRow 与 PanelistRow 合并，补全 name/title/color
function enrichMessages(
  messages: MessageRow[],
  panelists: PanelistRow[]
): (MessageRow & { name: string; title: string; color: string })[] {
  const map: Record<string, PanelistRow> = {}
  for (const p of panelists) {
    map[p.id] = p
  }
  return messages.map(m => ({
    ...m,
    name: map[m.panelist_id]?.name ?? '未知',
    title: map[m.panelist_id]?.title ?? '',
    color: map[m.panelist_id]?.color ?? '#888888',
  }))
}

// GET /api/discussions — 获取讨论列表
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getDb()
    const discussions = queryAll(db, 'SELECT * FROM discussions ORDER BY created_at DESC') as DiscussionRow[]

    const enriched = discussions.map(d => {
      const panelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [d.id]) as PanelistRow[]
      return { ...d, panelists }
    })

    res.json(enriched)
  } catch (e) {
    console.error('[GET /api/discussions] 错误:', e)
    res.status(500).json({ error: '获取讨论列表失败' })
  }
})

// POST /api/discussions — 创建新讨论
router.post('/', async (req: Request, res: Response) => {
  try {
    const { topic, expert_count } = req.body

    if (!topic || !topic.trim()) {
      res.status(400).json({ error: '话题不能为空' })
      return
    }
    if (!expert_count || expert_count < 1 || expert_count > 8) {
      res.status(400).json({ error: '专家人数必须在 1-8 之间' })
      return
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY' })
      return
    }

    const llm = createLLMClient(apiKey)
    const panelists = await generatePanelists({ topic: topic.trim(), expert_count }, llm)

    const db = await getDb()
    const discussionId = uuidv4()

    execute(db,
      'INSERT INTO discussions (id, topic, expert_count, status) VALUES (?, ?, ?, ?)',
      [discussionId, topic.trim(), expert_count, 'pending']
    )

    for (const p of panelists) {
      const panelistId = uuidv4()
      execute(db,
        'INSERT INTO panelists (id, discussion_id, name, role, title, stance, color, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [panelistId, discussionId, p.name, p.role, p.title, p.stance, p.color, 'standby']
      )
    }

    const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [discussionId]) as DiscussionRow
    const createdPanelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [discussionId]) as PanelistRow[]

    console.log('[POST /api/discussions] 讨论创建成功, id:', discussionId, 'topic:', topic)
    res.status(201).json({ ...discussion, panelists: createdPanelists })
  } catch (e: any) {
    console.error('[POST /api/discussions] 错误:', e)
    const status = e.statusCode || 500
    res.status(status).json({ error: e.message || '创建讨论失败' })
  }
})

// GET /api/discussions/:id — 获取单个讨论
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow | undefined
    if (!discussion) {
      res.status(404).json({ error: '讨论不存在' })
      return
    }

    const panelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
    const messages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]
    const consensus = queryAll(db, 'SELECT * FROM consensus_points WHERE discussion_id = ?', [req.params.id]) as ConsensusRow[]
    const divergence = queryAll(db, 'SELECT * FROM divergence_points WHERE discussion_id = ?', [req.params.id]) as DivergenceRow[]

    const enrichedMessages = enrichMessages(messages, panelists)
    console.log('[GET /:id] enriched msg sample:', enrichedMessages[0]?.name)
    res.json({ ...discussion, panelists, messages: enrichedMessages, consensus, divergence })
  } catch (e) {
    console.error('[GET /api/discussions/:id] 错误:', e)
    res.status(500).json({ error: '获取讨论详情失败' })
  }
})

// POST /api/discussions/:id/confirm — 确认并开始讨论（前端调用）
router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow | undefined
    if (!discussion) {
      res.status(404).json({ error: '讨论不存在' })
      return
    }

    if (discussion.status !== 'pending') {
      res.status(400).json({ error: '讨论已开始或已结束' })
      return
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY' })
      return
    }

    const llm = createLLMClient(apiKey)

    execute(db, 'UPDATE discussions SET status = ? WHERE id = ?', ['live', req.params.id])

    const panelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
    const messages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]

    const decision = await decideNextSpeaker(
      {
        topic: discussion.topic,
        panelists: panelists.map(p => ({ id: p.id, name: p.name, role: p.role, status: p.status })),
        messages: messages.map(m => ({ panelist_id: m.panelist_id, name: '', content: m.content, type: m.type })),
      },
      llm
    )

    const msgId = uuidv4()
    const nextSeq = messages.length + 1
    execute(db,
      'INSERT INTO messages (id, discussion_id, panelist_id, content, type, seq) VALUES (?, ?, ?, ?, ?, ?)',
      [msgId, req.params.id, decision.panelist_id, decision.content, decision.type, nextSeq]
    )

    execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['speaking', decision.panelist_id])
    execute(db, 'INSERT INTO panelist_status_logs (id, panelist_id, status, focus) VALUES (?, ?, ?, ?)',
      [uuidv4(), decision.panelist_id, 'speaking', null]
    )

    const updatedDiscussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow
    const updatedPanelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
    const updatedMessages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]

    console.log('[POST /api/discussions/:id/confirm] 讨论确认并开始, id:', req.params.id)
    res.json({ ...updatedDiscussion, panelists: updatedPanelists, messages: enrichMessages(updatedMessages, updatedPanelists), consensus: [], divergence: [] })
  } catch (e: any) {
    console.error('[POST /api/discussions/:id/confirm] 错误:', e)
    const status = e.statusCode || 500
    res.status(status).json({ error: e.message || '确认讨论失败' })
  }
})

// POST /api/discussions/:id/start — 开始讨论（手动触发）
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow | undefined
    if (!discussion) {
      res.status(404).json({ error: '讨论不存在' })
      return
    }

    if (discussion.status !== 'pending') {
      res.status(400).json({ error: '讨论已开始或已结束' })
      return
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY' })
      return
    }

    const llm = createLLMClient(apiKey)

    execute(db, 'UPDATE discussions SET status = ? WHERE id = ?', ['live', req.params.id])

    const panelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
    const messages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]

    const decision = await decideNextSpeaker(
      {
        topic: discussion.topic,
        panelists: panelists.map(p => ({ id: p.id, name: p.name, role: p.role, status: p.status })),
        messages: messages.map(m => ({ panelist_id: m.panelist_id, name: '', content: m.content, type: m.type })),
      },
      llm
    )

    const msgId = uuidv4()
    const nextSeq = messages.length + 1
    execute(db,
      'INSERT INTO messages (id, discussion_id, panelist_id, content, type, seq) VALUES (?, ?, ?, ?, ?, ?)',
      [msgId, req.params.id, decision.panelist_id, decision.content, decision.type, nextSeq]
    )

    execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['speaking', decision.panelist_id])
    execute(db, 'INSERT INTO panelist_status_logs (id, panelist_id, status, focus) VALUES (?, ?, ?, ?)',
      [uuidv4(), decision.panelist_id, 'speaking', null]
    )

    const updatedDiscussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow
    const updatedPanelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
    const updatedMessages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]

    console.log('[POST /api/discussions/:id/start] 讨论开始, id:', req.params.id)
    res.json({ ...updatedDiscussion, panelists: updatedPanelists, messages: enrichMessages(updatedMessages, updatedPanelists), consensus: [], divergence: [] })
  } catch (e: any) {
    console.error('[POST /api/discussions/:id/start] 错误:', e)
    const status = e.statusCode || 500
    res.status(status).json({ error: e.message || '开始讨论失败' })
  }
})

// POST /api/discussions/:id/next-step — 逐步推进讨论
router.post('/:id/next-step', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow | undefined
    if (!discussion) {
      res.status(404).json({ error: '讨论不存在' })
      return
    }

    if (discussion.status !== 'live') {
      res.status(400).json({ error: '讨论未在运行中' })
      return
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY' })
      return
    }

    const llm = createLLMClient(apiKey)

    const panelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
    const messages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]

    const panelistNameMap: Record<string, string> = {}
    for (const p of panelists) {
      panelistNameMap[p.id] = p.name
    }

    const decision = await decideNextSpeaker(
      {
        topic: discussion.topic,
        panelists: panelists.map(p => ({ id: p.id, name: p.name, role: p.role, status: p.status })),
        messages: messages.map(m => ({ panelist_id: m.panelist_id, name: panelistNameMap[m.panelist_id] || '', content: m.content, type: m.type })),
      },
      llm
    )

    const msgId = uuidv4()
    const nextSeq = messages.length + 1
    execute(db,
      'INSERT INTO messages (id, discussion_id, panelist_id, content, type, seq) VALUES (?, ?, ?, ?, ?, ?)',
      [msgId, req.params.id, decision.panelist_id, decision.content, decision.type, nextSeq]
    )

    execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['speaking', decision.panelist_id])
    execute(db, 'INSERT INTO panelist_status_logs (id, panelist_id, status, focus) VALUES (?, ?, ?, ?)',
      [uuidv4(), decision.panelist_id, 'speaking', null]
    )

    let consensusResult = { consensus: [] as { content: string; confidence: number }[], divergence: [] as { content: string; perspectives: string[] }[] }
    if (nextSeq >= 4) {
      const existingConsensus = queryAll(db, 'SELECT * FROM consensus_points WHERE discussion_id = ?', [req.params.id]) as ConsensusRow[]
      const existingDivergence = queryAll(db, 'SELECT * FROM divergence_points WHERE discussion_id = ?', [req.params.id]) as DivergenceRow[]
      const recentMsgs = messages.slice(-5).map(m => ({
        panelist_id: m.panelist_id,
        name: panelistNameMap[m.panelist_id] || '',
        content: m.content,
      }))

      consensusResult = await extractConsensus(
        {
          topic: discussion.topic,
          recentMessages: recentMsgs,
          existingConsensus: existingConsensus.map(c => ({ id: c.id, content: c.content, confidence: c.confidence })),
          existingDivergence: existingDivergence.map(d => ({ id: d.id, content: d.content, perspectives: JSON.parse(d.perspectives) })),
        },
        llm
      )

      for (const c of consensusResult.consensus) {
        execute(db, 'INSERT INTO consensus_points (id, discussion_id, content, confidence) VALUES (?, ?, ?, ?)',
          [uuidv4(), req.params.id, c.content, c.confidence]
        )
      }

      for (const d of consensusResult.divergence) {
        execute(db, 'INSERT INTO divergence_points (id, discussion_id, content, perspectives) VALUES (?, ?, ?, ?)',
          [uuidv4(), req.params.id, d.content, JSON.stringify(d.perspectives)]
        )
      }
    }

    if (decision.type === 'closing' || nextSeq >= 15) {
      execute(db, 'UPDATE discussions SET status = ? WHERE id = ?', ['ended', req.params.id])
      // Set all panelists back to standby
      for (const p of panelists) {
        execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['standby', p.id])
      }
      console.log('[POST /api/discussions/:id/next-step] 讨论结束, id:', req.params.id)
    }

    const updatedMessages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]
    const updatedConsensus = queryAll(db, 'SELECT * FROM consensus_points WHERE discussion_id = ?', [req.params.id]) as ConsensusRow[]
    const updatedDivergence = queryAll(db, 'SELECT * FROM divergence_points WHERE discussion_id = ?', [req.params.id]) as DivergenceRow[]
    const updatedDiscussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow
    const updatedPanelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]

    res.json({
      ...updatedDiscussion,
      panelists: updatedPanelists,
      messages: enrichMessages(updatedMessages, updatedPanelists),
      consensus: updatedConsensus,
      divergence: updatedDivergence,
      newConsensus: consensusResult.consensus,
      newDivergence: consensusResult.divergence,
      latestMessage: decision,
    })
  } catch (e: any) {
    console.error('[POST /api/discussions/:id/next-step] 错误:', e)
    const status = e.statusCode || 500
    res.status(status).json({ error: e.message || '推进讨论失败' })
  }
})

// GET /api/discussions/:id/stream — SSE 实时讨论流
router.get('/:id/stream', async (req: Request, res: Response) => {
  const db = await getDb()
  const discussion = queryOne(db, 'SELECT * FROM discussions WHERE id = ?', [req.params.id]) as DiscussionRow | undefined
  if (!discussion) {
    res.status(404).json({ error: '讨论不存在' })
    return
  }
  if (discussion.status !== 'live') {
    res.status(400).json({ error: `讨论状态为 ${discussion.status}，无法连接流` })
    return
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY' })
    return
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const llm = createLLMClient(apiKey)
  let aborted = false

  req.on('close', () => {
    aborted = true
    console.log('[SSE] 客户端断开, discussion:', req.params.id)
  })

  const sendEvent = (event: string, data: unknown) => {
    if (aborted) return
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    } catch {
      aborted = true
    }
  }

  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

  console.log('[SSE] 客户端连接, discussion:', req.params.id)

  try {
    const panelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
    const existingMessages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]

    // 发送已有的 messages 作为初始事件
    const enrichedInitial = enrichMessages(existingMessages, panelists)
    for (const m of enrichedInitial) {
      sendEvent('transcript_message', m)
    }

    // 发送当前 panelist 状态
    for (const p of panelists) {
      sendEvent('panelist_status', {
        panelist_id: p.id,
        status: p.status,
        focus: p.focus,
      })
    }

    // 讨论主循环
    while (!aborted) {
      const currentPanelists = queryAll(db, 'SELECT * FROM panelists WHERE discussion_id = ?', [req.params.id]) as PanelistRow[]
      const currentMessages = queryAll(db, 'SELECT * FROM messages WHERE discussion_id = ? ORDER BY seq', [req.params.id]) as MessageRow[]

      // 构建 name map 用于 context
      const nameMap: Record<string, string> = {}
      for (const p of currentPanelists) {
        nameMap[p.id] = p.name
      }

      const decision = await decideNextSpeaker(
        {
          topic: discussion.topic,
          panelists: currentPanelists.map(p => ({ id: p.id, name: p.name, role: p.role, status: p.status })),
          messages: currentMessages.map(m => ({
            panelist_id: m.panelist_id,
            name: nameMap[m.panelist_id] || '',
            content: m.content,
            type: m.type,
          })),
        },
        llm
      )

      if (aborted) break

      // 持久化消息
      const msgId = uuidv4()
      const nextSeq = currentMessages.length + 1
      execute(db,
        'INSERT INTO messages (id, discussion_id, panelist_id, content, type, seq) VALUES (?, ?, ?, ?, ?, ?)',
        [msgId, req.params.id, decision.panelist_id, decision.content, decision.type, nextSeq]
      )

      // 更新 panelist 状态：所有 speaking 的切回 standby，新发言人设为 speaking
      execute(db, 'UPDATE panelists SET status = ? WHERE discussion_id = ? AND status = ?', ['standby', req.params.id, 'speaking'])
      execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['speaking', decision.panelist_id])
      execute(db, 'INSERT INTO panelist_status_logs (id, panelist_id, status, focus) VALUES (?, ?, ?, ?)',
        [uuidv4(), decision.panelist_id, 'speaking', null]
      )

      // 发送 transcript_message 事件
      const speaker = currentPanelists.find(p => p.id === decision.panelist_id)
      sendEvent('transcript_message', {
        id: msgId,
        discussion_id: req.params.id,
        panelist_id: decision.panelist_id,
        name: speaker?.name ?? nameMap[decision.panelist_id] ?? '未知',
        title: speaker?.title ?? '',
        color: speaker?.color ?? '#888888',
        content: decision.content,
        type: decision.type,
        seq: nextSeq,
        created_at: new Date().toISOString(),
      })

      // 发送 panelist_status 事件
      for (const p of currentPanelists) {
        sendEvent('panelist_status', {
          panelist_id: p.id,
          status: p.id === decision.panelist_id ? 'speaking' as const : (p.status === 'speaking' ? 'standby' as const : p.status),
          focus: null as string | null,
        })
      }

      // 每隔约 3 条新消息提取共识/分歧（首次在 ≥4 条时）
      const totalMsgs = currentMessages.length + 1
      if (totalMsgs >= 4 && totalMsgs % 3 === 1) {
        const existingConsensus = queryAll(db, 'SELECT * FROM consensus_points WHERE discussion_id = ?', [req.params.id]) as ConsensusRow[]
        const existingDivergence = queryAll(db, 'SELECT * FROM divergence_points WHERE discussion_id = ?', [req.params.id]) as DivergenceRow[]
        const recentMsgs = currentMessages.slice(-5).map(m => ({
          panelist_id: m.panelist_id,
          name: nameMap[m.panelist_id] || '',
          content: m.content,
        }))

        try {
          const consensusResult = await extractConsensus(
            {
              topic: discussion.topic,
              recentMessages: recentMsgs,
              existingConsensus: existingConsensus.map(c => ({ id: c.id, content: c.content, confidence: c.confidence })),
              existingDivergence: existingDivergence.map(d => ({ id: d.id, content: d.content, perspectives: JSON.parse(d.perspectives || '[]') })),
            },
            llm
          )

          if (!aborted) {
            for (const c of consensusResult.consensus) {
              const cid = uuidv4()
              execute(db, 'INSERT INTO consensus_points (id, discussion_id, content, confidence) VALUES (?, ?, ?, ?)',
                [cid, req.params.id, c.content, c.confidence]
              )
              sendEvent('consensus_update', {
                id: cid, discussion_id: req.params.id, content: c.content, confidence: c.confidence, updated_at: new Date().toISOString(),
              })
            }
            for (const d of consensusResult.divergence) {
              const did = uuidv4()
              execute(db, 'INSERT INTO divergence_points (id, discussion_id, content, perspectives) VALUES (?, ?, ?, ?)',
                [did, req.params.id, d.content, JSON.stringify(d.perspectives)]
              )
              sendEvent('divergence_update', {
                id: did, discussion_id: req.params.id, content: d.content, perspectives: d.perspectives, updated_at: new Date().toISOString(),
              })
            }
          }
        } catch (consensusErr) {
          console.error('[SSE] 共识提取失败:', consensusErr)
        }
      }

      // 结束检测
      if (decision.type === 'closing' || totalMsgs >= 15) {
        execute(db, 'UPDATE discussions SET status = ? WHERE id = ?', ['ended', req.params.id])
        for (const p of currentPanelists) {
          execute(db, 'UPDATE panelists SET status = ? WHERE id = ?', ['standby', p.id])
        }
        sendEvent('discussion_end', { summary: decision.type === 'closing' ? decision.content : '讨论已到达最大轮次' })
        console.log('[SSE] 讨论结束, id:', req.params.id)
        break
      }

      // 轮次间隔（模拟真实讨论节奏）
      await delay(3000)
    }
  } catch (e: any) {
    console.error('[SSE] 讨论流错误:', e)
    if (!aborted) {
      sendEvent('error', { message: e.message || '讨论流发生错误' })
    }
  } finally {
    if (!aborted) {
      try { res.end() } catch { /* socket already closed */ }
    }
  }
})

export default router
