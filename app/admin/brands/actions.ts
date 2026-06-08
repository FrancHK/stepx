'use server'

import { createClient } from '@supabase/supabase-js'
import type { Brand } from '@/lib/types'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function addBrand(name: string): Promise<Brand> {
  const { data, error } = await adminClient()
    .from('brands')
    .insert({ name: name.trim(), active: true })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Brand
}

export async function updateBrand(id: string, name: string) {
  const { error } = await adminClient()
    .from('brands')
    .update({ name: name.trim() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleBrand(id: string, active: boolean) {
  const { error } = await adminClient()
    .from('brands')
    .update({ active })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteBrand(id: string) {
  const { error } = await adminClient()
    .from('brands')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
