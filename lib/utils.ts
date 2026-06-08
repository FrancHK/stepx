import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import type { OrderStatus, PaymentMethod, Category, AgeGroup } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  const n = Math.round(amount ?? 0)
  const formatted = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `TZS ${formatted}`
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Inasubiri',
  confirmed: 'Imethibitishwa',
  processing: 'Inashughulikiwa',
  in_transit: 'Safarini',
  delivered: 'Imewasilishwa',
  cancelled: 'Imefutwa',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  processing: 'bg-purple-100 text-purple-700 border-purple-200',
  in_transit: 'bg-teal-100 text-teal-700 border-teal-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  mpesa: 'M-Pesa',
  card: 'Kadi',
  cod: 'Lipa Upokeapo',
  manual: 'Malipo ya Mkono',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  yebo: 'Yebo',
  sendo: 'Sendo',
  mabuti: 'Mabuti',
  ndara: 'Ndara',
  boti_boti: 'Boti Boti',
}

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  mtoto: 'Mtoto',
  kijana: 'Kijana',
  mtu_mzima: 'Mtu Mzima',
}

export const ORDER_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'in_transit', 'delivered', 'cancelled'
]
