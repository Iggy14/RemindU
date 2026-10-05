// In-memory sliding window per user. Serverless instances don't share memory, so this is a
// best-effort guard against a runaway client, not a hard quota. See docs/TODO.md.
const hits = new Map<string, number[]>()

export function allowRequest(userId: string, limit = 20, windowMs = 60_000, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(userId, recent)
    return false
  }
  recent.push(now)
  hits.set(userId, recent)
  return true
}
