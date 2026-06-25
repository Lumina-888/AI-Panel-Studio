import { useEffect, useRef } from 'react'
import { useDiscussionStore } from '../../stores/discussionStore'
import type { Message } from '../../types'

export function TranscriptView() {
  const { messages } = useDiscussionStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-dim animate-pulse">等待主持人开场...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const typeLabel = (t: string) => {
    switch (t) {
      case 'opening': return '开场'
      case 'statement': return ''
      case 'rebuttal': return '反驳'
      case 'supplement': return '补充'
      case 'closing': return '总结'
      default: return ''
    }
  }

  return (
    <div className="animate-fade-in-up flex gap-3 group">
      {/* 发言人头像 */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: message.color + '22', color: message.color }}
      >
        {message.name[0]}
      </div>

      {/* 发言内容 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold" style={{ color: message.color }}>
            {message.name}
          </span>
          <span className="text-xs text-text-dim">{message.title}</span>
          {typeLabel(message.type) && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-text-dim">
              {typeLabel(message.type)}
            </span>
          )}
        </div>
        <p className="text-sm text-text-primary leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}
