// Shared by the client and the /api routes: use relative imports only in src/ai (no '@/' alias).
import type { Offset, Rule } from '../ruleEngine/types'

export const CATEGORIES = ['subscription', 'bill', 'expiry', 'deadline', 'custom'] as const
export type Category = (typeof CATEGORIES)[number]

/** A fully-specified responsibility, ready to be saved (by the form, or from an AI-parsed draft). */
export type Draft = {
  title: string
  category: Category
  /** true = shared with the group, false = private to the signed-in user */
  shared: boolean
  rule: Rule
  offsets: Offset[]
}

/** One turn of the conversation sent to /api/ai/parse. */
export type ChatTurn = { role: 'user' | 'assistant'; content: string }
