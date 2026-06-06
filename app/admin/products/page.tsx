import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ProductsClient from './ProductsClient'
import type { Product } from '@/lib/types'

async function getProducts(): Promise<Product[]> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
  return (data ?? []) as Product[]
}

export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductsClient initialProducts={products} />
}
