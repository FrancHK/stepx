import { createClient } from '@supabase/supabase-js'
import BrandsClient from './BrandsClient'
import type { Brand } from '@/lib/types'

async function getBrands(): Promise<Brand[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true })
  if (error) console.error('Brands fetch error:', error.message)
  return (data ?? []) as Brand[]
}

export default async function BrandsPage() {
  const brands = await getBrands()
  return <BrandsClient initialBrands={brands} />
}
