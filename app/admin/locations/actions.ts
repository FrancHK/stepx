'use server'

import { createClient } from '@supabase/supabase-js'
import type { Location } from '@/lib/types'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function addLocation(name: string, address: string, description: string): Promise<Location> {
  const { data, error } = await adminClient()
    .from('locations')
    .insert({ name: name.trim(), address: address.trim(), description: description.trim(), active: true })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Location
}

export async function updateLocation(id: string, name: string, address: string, description: string) {
  const { error } = await adminClient()
    .from('locations')
    .update({ name: name.trim(), address: address.trim(), description: description.trim() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleLocation(id: string, active: boolean) {
  const { error } = await adminClient()
    .from('locations')
    .update({ active })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLocation(id: string) {
  const { error } = await adminClient()
    .from('locations')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
