'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function addMteja(data: {
  name: string
  phone: string
  location: string
  notes: string
}) {
  const { error } = await adminClient().from('wateja').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/wateja')
}

export async function updateMteja(
  id: string,
  data: { name: string; phone: string; location: string; notes: string }
) {
  const { error } = await adminClient().from('wateja').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/wateja')
}

export async function deleteMteja(id: string) {
  const { error } = await adminClient().from('wateja').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/wateja')
}
