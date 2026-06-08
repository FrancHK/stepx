import { createClient } from '@supabase/supabase-js'
import OrdersClient from './OrdersClient'
import type { Order } from '@/lib/types'

async function getOrders(): Promise<Order[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) console.error('Orders fetch error:', error.message)
  return (data ?? []) as Order[]
}

export default async function OrdersPage() {
  const orders = await getOrders()
  return <OrdersClient initialOrders={orders} />
}
