'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { saveSubscription, removeSubscription } from '@/app/admin/push/actions'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

type State = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export default function PushToggle() {
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported'); return
    }
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (Notification.permission === 'denied') { setState('denied'); return }
        setState(sub ? 'subscribed' : 'unsubscribed')
      })
    }).catch(() => setState('unsupported'))
  }, [])

  async function toggle() {
    if (state === 'subscribed') {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await removeSubscription(sub.endpoint)
      }
      setState('unsubscribed')
      toast.success('Notifications zimezimwa.')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setState('denied'); toast.error('Ruhusa imekataliwa.'); return }

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })
    const key = sub.getKey('p256dh')
    const auth = sub.getKey('auth')
    await saveSubscription({
      endpoint: sub.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(key!))),
      auth: btoa(String.fromCharCode(...new Uint8Array(auth!))),
    })
    setState('subscribed')
    toast.success('Notifications zimewashwa! Utapata arifa kila order mpya.')
  }

  if (state === 'loading' || state === 'unsupported') return null

  return (
    <button
      onClick={toggle}
      title={state === 'subscribed' ? 'Zima notifications' : 'Washa notifications'}
      className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer ${
        state === 'subscribed'
          ? 'bg-[#0D47A1] text-white shadow-md'
          : state === 'denied'
          ? 'bg-red-100 text-red-400 cursor-not-allowed'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {state === 'subscribed'
        ? <Bell className="w-4 h-4" />
        : state === 'denied'
        ? <BellOff className="w-4 h-4" />
        : <Bell className="w-4 h-4" />
      }
      {state === 'subscribed' && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
      )}
    </button>
  )
}
