export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'in_transit' | 'delivered' | 'cancelled'
export type PaymentMethod = 'mpesa' | 'card' | 'cod' | 'manual'
export type Category = 'yebo' | 'sendo' | 'mabuti' | 'ndara' | 'boti_boti'
export type AgeGroup = 'mtoto' | 'kijana' | 'mtu_mzima'

export interface Product {
  id: string
  name: string
  brand: string
  category: Category
  description: string
  wholesale_price: number
  retail_price: number
  stock: Record<string, number>
  images: string[]
  active: boolean
  age_group: AgeGroup
  color: Record<string, string>
  size_type: 'single' | 'range'
  is_trending: boolean
  is_new: boolean
  created_at: string
}

export interface OrderItem {
  product_id: string
  product_name: string
  size: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  user_id: string
  user_name: string
  user_phone: string
  user_email: string
  delivery_address: string
  items: OrderItem[]
  order_type: string
  subtotal: number
  total: number
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: string
  mpesa_ref: string
  payment_proof_url: string
  vehicle_number: string
  conductor_phone: string
  brand_name: string
  transit_location: string
  transport_company: string
  transport_phone: string
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  name: string
  active: boolean
  created_at: string
}

export interface Location {
  id: string
  name: string
  address: string
  description: string
  active: boolean
  created_at: string
}

export interface Transporter {
  id: string
  name: string
  phone: string
  location: string
  description: string
  active: boolean
  created_at: string
}

export interface MsafiriUser {
  id: string
  name: string
  email: string
  phone: string
  customer_type: 'retail' | 'wholesale'
  disabled: boolean
  created_at: string
}
