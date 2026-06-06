import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import CustomersClient from './CustomersClient'
import type { MsafiriUser } from '@/lib/types'

async function getCustomers(): Promise<MsafiriUser[]> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
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
