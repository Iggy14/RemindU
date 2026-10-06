import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// Captured before createClient consumes the URL hash: the PASSWORD_RECOVERY event can fire
// before React subscribes, so the reset link is also detected here.
export const openedFromRecoveryLink = /[#&]type=recovery\b/.test(window.location.hash)

// Placeholders keep the app from crashing on import; App shows a setup message instead.
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing')
