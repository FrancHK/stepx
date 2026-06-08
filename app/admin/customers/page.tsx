import { createClient } from '@supabase/supabase-js'
import CustomersClient from './CustomersClient'
import type { MsafiriUser } from '@/lib/types'

async function getCustomers(): Promise<MsafiriUser[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('msafiri_users')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as MsafiriUser[]
}

export default async function CustomersPage() {
  const customers = await getCustomers()
  return <CustomersClient initialCustomers={customers} />
}
