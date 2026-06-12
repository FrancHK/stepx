import { createClient } from '@supabase/supabase-js'
import ProductsClient from './ProductsClient'
import type { Product, Brand } from '@/lib/types'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getProducts(): Promise<Product[]> {
  const { data } = await adminClient().from('products').select('*').order('created_at', { ascending: false })
  return (data ?? []) as Product[]
}

async function getBrands(): Promise<Brand[]> {
  const { data } = await adminClient().from('brands').select('*').eq('active', true).order('name')
  return (data ?? []) as Brand[]
}

export default async function ProductsPage() {
  const [products, brands] = await Promise.all([getProducts(), getBrands()])
  return <ProductsClient initialProducts={products} brands={brands} />
}
