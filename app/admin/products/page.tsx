import { createClient } from '@supabase/supabase-js'
import ProductsClient from './ProductsClient'
import type { Product } from '@/lib/types'

async function getProducts(): Promise<Product[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
  return (data ?? []) as Product[]
}

export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductsClient initialProducts={products} />
}
