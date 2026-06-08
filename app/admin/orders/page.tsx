import { createClient } from '@supabase/supabase-js'
import OrdersClient from './OrdersClient'
import type { Order, Transporter, Location } from '@/lib/types'

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const [
    { data: orders, error },
    { data: transporters },
    { data: locations },
  ] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('transporters').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
  ])
  if (error) console.error('Orders fetch error:', error.message)
  return {
    orders: (orders ?? []) as Order[],
    transporters: (transporters ?? []) as Transporter[],
    locations: (locations ?? []) as Location[],
  }
}

export default async function OrdersPage() {
  const { orders, transporters, locations } = await getData()
  return <OrdersClient initialOrders={orders} transporters={transporters} locations={locations} />
}
