'use server'

import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface GuestOrderItem {
  product_id: string
  product_name: string
  size: string
  quantity: number
  price: number
}

export interface GuestOrderInput {
  user_name: string
  user_phone: string
  delivery_address: string
  payment_method?: string
  items: GuestOrderItem[]
  subtotal: number
  total: number
}

export async function submitGuestOrder(input: GuestOrderInput): Promise<string> {
  const supabase = adminClient()
  const guestId = '00000000-0000-0000-0000-000000000000'

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: guestId,
      user_name: input.user_name.trim(),
      user_phone: input.user_phone.trim(),
      user_email: null,
      delivery_address: input.delivery_address.trim(),
      items: input.items,
      order_type: 'retail',
      subtotal: input.subtotal,
      total: input.total,
      status: 'pending',
      payment_method: input.payment_method ?? 'manual',
      payment_status: 'pending',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}
