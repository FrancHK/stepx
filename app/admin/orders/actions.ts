'use server'

import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  extra?: {
    vehicle_number?: string
    conductor_phone?: string
    transport_company?: string
    transport_phone?: string
    transit_location?: string
  }
) {
  const supabase = adminClient()
  const { error } = await supabase
    .from('orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
}
