import { createClient } from '@supabase/supabase-js'
import ShopClient from './ShopClient'
import type { Product } from '@/lib/types'

export const revalidate = 120

async function getProducts(): Promise<Product[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
  return (data ?? []).map(p => ({ ...p, retail_price: Number(p.retail_price), wholesale_price: Number(p.wholesale_price ?? p.retail_price) })) as Product[]
}

export default async function ShopPage() {
  const products = await getProducts()
  return <ShopClient products={products} />
}
