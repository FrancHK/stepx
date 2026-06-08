import { createClient } from '@supabase/supabase-js'
import WatejaClient from './WatejaClient'
import type { Mteja } from '@/lib/types'

async function getWateja(): Promise<Mteja[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('wateja')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Mteja[]
}

export default async function WatejaPage() {
  const wateja = await getWateja()
  return <WatejaClient initialWateja={wateja} />
}
