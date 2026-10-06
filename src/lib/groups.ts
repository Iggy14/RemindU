import { supabase } from '@/lib/supabase'

export type Group = { id: string; name: string; invite_code: string }
export type Member = { user_id: string; display_name: string }

export async function fetchMyGroup(): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select('id, name, invite_code').limit(1)
  if (error) throw error
  return data[0] ?? null
}

export async function fetchMembers(groupId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, profiles(display_name)')
    .eq('group_id', groupId)
  if (error) throw error
  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { user_id: row.user_id, display_name: profile?.display_name || 'Unnamed' }
  })
}

export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', { group_name: name })
  if (error) throw error
  return data as Group
}

export async function joinGroup(code: string): Promise<Group> {
  const { data, error } = await supabase.rpc('join_group', { code })
  if (error) throw error
  return data as Group
}

/**
 * The signed-in user's timezone. New profiles default to UTC, so on first load we adopt
 * the browser's timezone and save it.
 */
export async function ensureTimezone(userId: string): Promise<string> {
  const { data, error } = await supabase.from('profiles').select('timezone').eq('id', userId).single()
  if (error) throw error
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (data.timezone !== 'UTC' || !browser || browser === 'UTC') return data.timezone
  const { error: updateError } = await supabase.from('profiles').update({ timezone: browser }).eq('id', userId)
  if (updateError) throw updateError
  return browser
}

/**
 * Leave a group. Your private reminders there become unreachable once you are no longer a
 * member, so they are deleted first (RLS only allows this while you are still in the group).
 * Shared reminders stay with the group.
 */
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error: itemsError } = await supabase
    .from('responsibilities')
    .delete()
    .eq('group_id', groupId)
    .eq('owner_id', userId)
  if (itemsError) throw itemsError
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
  if (error) throw error
}
