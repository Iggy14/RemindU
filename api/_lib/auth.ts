import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Caller = {
  userId: string
  /** Supabase client acting as the caller, so row-level security applies to everything it reads */
  db: SupabaseClient
}

/**
 * Checks the Supabase session token on a request. Returns the caller, or null.
 * AI routes must call this first: they spend our model quota and read the user's data.
 */
export async function getCaller(request: Request): Promise<Caller | null> {
  const header = request.headers.get('authorization')
  const token = header?.match(/^Bearer (.+)$/i)?.[1]
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!header || !token || !url || !anonKey) return null

  const db = createClient(url, anonKey, {
    global: { headers: { Authorization: header } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.auth.getUser(token)
  return error ? null : { userId: data.user.id, db }
}
