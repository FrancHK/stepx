'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Search, Download, Eye, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS,
  PAYMENT_LABELS, ORDER_STATUSES
} from '@/lib/utils'
import type { Order, OrderStatus } from '@/lib/types'

interface Props { initialOrders: Order[] }

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending')
  const [updating, setUpdating] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter(o => {
      const matchTab = activeTab === 'all' || o.status === activeTab
      const matchSearch = !q ||
        o.user_name?.toLowerCase().includes(q) ||
        o.user_phone?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      return matchTab && matchSearch
    })
  }, [orders, search, activeTab])

  function countByStatus(status: string) {
    if (status === 'all') return orders.length
    return orders.filter(o => o.status === status).length
  }

  function openOrder(order: Order) {
    setSelectedOrder(order)
    setNewStatus(order.status)
  }

  async function updateStatus() {
    if (!selectedOrder) return
    setUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedOrder.id)
      if (error) throw error
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o))
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
      toast.success('Status imesasishwa!')
    } catch {
      toast.error('Kuna tatizo. Jaribu tena.')
    } finally {
      setUpdating(false)
    }
  }

  function exportCSV() {
    const headers = ['Order ID', 'Customer', 'Phone', 'Email', 'Total', 'Status', 'Payment', 'Date']
    const rows = filtered.map(o => [
      o.id, o.user_name, o.user_phone, o.user_email,
      o.total, o.status, o.payment_method, o.created_at
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalItems = (items: Order['items']) =>
    Array.isArray(items) ? items.reduce((s, i) => s + (i.quantity ?? 0), 0) : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} total orders</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2 cursor-pointer">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, phone, or order ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
              activeTab === tab.value
                ? 'bg-[#0D47A1] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {countByStatus(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['Order ID', 'Customer', 'Phone', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => openOrder(order)}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[120px] truncate">{order.user_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{order.user_phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{totalItems(order.items)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatCurrency(order.total ?? 0)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {PAYMENT_LABELS[order.payment_method as keyof typeof PAYMENT_LABELS] ?? order.payment_method ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); openOrder(order) }}
                      className="text-[#0D47A1] hover:text-[#0a3880] font-medium text-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    Hakuna orders zinazolingana.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0D47A1]">
              Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-5 mt-2">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Customer</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Name:</span> <span className="font-medium">{selectedOrder.user_name ?? '—'}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedOrder.user_phone ?? '—'}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedOrder.user_email ?? '—'}</span></div>
                  <div><span className="text-gray-500">Address:</span> <span className="font-medium">{selectedOrder.delivery_address ?? '—'}</span></div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Items</h3>
                <div className="space-y-2">
                  {(selectedOrder.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-800">{item.product_name}</span>
                        <span className="text-gray-500 ml-2">Size {item.size}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600">x{item.quantity}</span>
                        <span className="ml-3 font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal ?? 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-800 pt-1">
                  <span>Total</span><span className="text-[#0D47A1]">{formatCurrency(selectedOrder.total ?? 0)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Payment</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Method:</span> <span className="font-medium">{PAYMENT_LABELS[selectedOrder.payment_method as keyof typeof PAYMENT_LABELS] ?? selectedOrder.payment_method ?? '—'}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className="font-medium">{selectedOrder.payment_status ?? '—'}</span></div>
                  {selectedOrder.mpesa_ref && (
                    <div><span className="text-gray-500">M-Pesa Ref:</span> <span className="font-medium font-mono">{selectedOrder.mpesa_ref}</span></div>
                  )}
                </div>
                {selectedOrder.payment_proof_url && (
                  <div className="mt-2">
                    <p className="text-gray-500 text-sm mb-1">Payment Proof:</p>
                    <img src={selectedOrder.payment_proof_url} alt="Payment proof" className="rounded-lg max-h-40 object-cover" />
                  </div>
                )}
              </div>

              {/* Delivery Info */}
              {(selectedOrder.vehicle_number || selectedOrder.conductor_phone) && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-blue-700 text-sm uppercase tracking-wide">Delivery</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedOrder.vehicle_number && (
                      <div><span className="text-gray-500">Vehicle:</span> <span className="font-medium">{selectedOrder.vehicle_number}</span></div>
                    )}
                    {selectedOrder.conductor_phone && (
                      <div><span className="text-gray-500">Conductor:</span> <span className="font-medium">{selectedOrder.conductor_phone}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Update Status */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 text-sm mb-3">Update Status</h3>
                <div className="flex gap-3">
                  <Select value={newStatus} onValueChange={v => setNewStatus(v as OrderStatus)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={updateStatus}
                    disabled={updating || newStatus === selectedOrder.status}
                    className="bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer"
                  >
                    {updating ? 'Saving...' : 'Update'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
