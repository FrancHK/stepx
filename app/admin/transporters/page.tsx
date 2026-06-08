import { createClient } from '@supabase/supabase-js'
import TransportersClient from './TransportersClient'
import type { Transporter } from '@/lib/types'

async function getTransporters(): Promise<Transporter[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('transporters')
    .select('*')
    .order('name', { ascending: true })
  if (error) console.error('Transporters fetch error:', error.message)
  return (data ?? []) as Transporter[]
}

export default async function TransportersPage() {
  const transporters = await getTransporters()
  return <TransportersClient initialTransporters={transporters} />
}
