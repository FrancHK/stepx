'use server'

import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function saveSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const { error } = await adminClient()
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

export async function removeSubscription(endpoint: string) {
  await adminClient().from('push_subscriptions').delete().eq('endpoint', endpoint)
}
