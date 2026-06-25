import OpenAI from 'openai'
import type { LLMClient } from '../types/index.js'

export function createLLMClient(apiKey: string): LLMClient {
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey,
  })

  return {
    async chat(messages) {
      const res = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        temperature: 0.8,
      })
      return res.choices[0]?.message?.content ?? ''
    },
  }
}
