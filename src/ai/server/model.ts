import { createGoogle } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

/** Free-tier friendly default. Override with the AI_MODEL env var; free quotas change, so check Google's rate-limit page. */
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

/**
 * The single place the AI provider is chosen. To switch provider (Groq, AI Gateway, ...),
 * change only this function; callers just receive a `LanguageModel`. Server-side only.
 */
export function getModel(): LanguageModel {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return createGoogle({ apiKey })(process.env.AI_MODEL || DEFAULT_MODEL)
}
