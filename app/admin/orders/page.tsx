import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OrdersClient from './OrdersClient'
import type { Order } from '@/lib/types'

async function getOrders(): Promise<Order[]> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Order[]
}

export default async function OrdersPage() {
  const orders = await getOrders()
  return <OrdersClient initialOrders={orders} />
}
