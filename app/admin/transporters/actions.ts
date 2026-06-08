'use server'

import { createClient } from '@supabase/supabase-js'
import type { Transporter } from '@/lib/types'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type TransporterInput = Pick<Transporter, 'name' | 'phone' | 'location' | 'description'>

export async function addTransporter(input: TransporterInput): Promise<Transporter> {
  const { data, error } = await adminClient()
    .from('transporters')
    .insert({ ...input, active: true })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Transporter
}

export async function updateTransporter(id: string, input: TransporterInput) {
  const { error } = await adminClient()
    .from('transporters')
    .update(input)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleTransporter(id: string, active: boolean) {
  const { error } = await adminClient()
    .from('transporters')
    .update({ active })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteTransporter(id: string) {
  const { error } = await adminClient()
    .from('transporters')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
