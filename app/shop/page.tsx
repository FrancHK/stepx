import { createClient } from '@supabase/supabase-js'
import ShopClient from './ShopClient'
import type { Product, Transporter, Location } from '@/lib/types'

export const revalidate = 120

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const [{ data: products }, { data: transporters }, { data: locations }] = await Promise.all([
    supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false }),
    supabase.from('transporters').select('*').eq('active', true).order('name'),
    supabase.from('locations').select('*').eq('active', true).order('name'),
  ])
  return {
    products: (products ?? []).map(p => ({
      ...p,
      retail_price: Number(p.retail_price),
      wholesale_price: Number(p.wholesale_price ?? p.retail_price),
    })) as Product[],
    transporters: (transporters ?? []) as Transporter[],
    locations: (locations ?? []) as Location[],
  }
}

export default async function ShopPage() {
  const { products, transporters, locations } = await getData()
  return <ShopClient products={products} transporters={transporters} locations={locations} />
}
