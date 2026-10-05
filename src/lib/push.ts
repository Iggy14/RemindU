import { supabase } from '@/lib/supabase'

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** iOS only exposes the Push API to a PWA installed on the Home Screen, so this is false in a Safari tab. */
export function pushSupported(): boolean {
  return Boolean(PUBLIC_KEY) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function readPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  // `ready` never resolves when no service worker is registered, so check first instead of hanging.
  if (!(await navigator.serviceWorker.getRegistration())) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return (await currentSubscription()) ? 'on' : 'off'
}

/** Must be called from a user gesture (a button tap): iOS refuses the permission prompt otherwise. */
export async function enablePush(userId: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') return Notification.permission === 'denied' ? 'denied' : 'off'

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY!) }))

  const { endpoint, keys } = subscription.toJSON()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint, keys, user_agent: navigator.userAgent }, { onConflict: 'endpoint' })
  if (error) throw error
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const subscription = await currentSubscription()
  if (subscription) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    if (error) throw error
    await subscription.unsubscribe()
  }
  return 'off'
}
