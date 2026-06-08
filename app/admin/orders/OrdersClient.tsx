'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { updateOrderStatus } from './actions'
import { Search, Download, Eye, Truck, Phone, Hash, Printer } from 'lucide-react'
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
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [conductorPhone, setConductorPhone] = useState('')
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
    setVehicleNumber(order.vehicle_number ?? '')
    setConductorPhone(order.conductor_phone ?? '')
  }

  const showTransitFields = newStatus === 'in_transit'

  async function updateStatus() {
    if (!selectedOrder) return
    if (showTransitFields && (!vehicleNumber.trim() || !conductorPhone.trim())) {
      toast.error('Weka namba ya gari na namba ya kondakta!')
      return
    }
    setUpdating(true)
    try {
      const extra = showTransitFields
        ? { vehicle_number: vehicleNumber.trim(), conductor_phone: conductorPhone.trim() }
        : undefined
      await updateOrderStatus(selectedOrder.id, newStatus, extra)
      const updatedOrder = {
        ...selectedOrder,
        status: newStatus,
        ...(extra ?? {}),
      }
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o))
      setSelectedOrder(updatedOrder)
      toast.success('Imesasishwa!')
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Kuna tatizo. Jaribu tena.')
    } finally {
      setUpdating(false)
    }
  }

  function printReceipt(order: Order) {
    const date = new Date(order.created_at).toLocaleDateString('en-GB')
    const statusLabel: Record<string, string> = {
      pending: 'Inasubiri', confirmed: 'Imethibitishwa', processing: 'Inashughulikiwa',
      in_transit: 'Safarini', delivered: 'Imewasilishwa', cancelled: 'Imefutwa',
    }
    const rows = (order.items ?? []).map(i => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">
          <div style="font-weight:600;color:#1a1a1a">${i.product_name}</div>
          <div style="color:#888;font-size:12px;margin-top:2px">Saizi: ${i.size} &nbsp;·&nbsp; Idadi: ${i.quantity}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#0D47A1;white-space:nowrap">
          ${formatCurrency(i.price * i.quantity)}
        </td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Risiti #${order.id.slice(0,8).toUpperCase()} - StepX</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:30px}
        .card{background:#fff;width:440px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
        @media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0;width:100%}.no-print{display:none}}
      </style>
    </head><body><div class="card">
      <div style="background:linear-gradient(135deg,#0D47A1,#1976D2);padding:28px 24px;text-align:center">
        <div style="font-size:28px;margin-bottom:6px">👟</div>
        <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px">StepX</div>
        <div style="color:#90CAF9;font-size:11px;margin-top:4px;text-transform:uppercase;letter-spacing:2px">Risiti ya Manunuzi</div>
      </div>
      <div style="background:#E3F2FD;padding:14px 24px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px">Order ID</div>
          <div style="font-size:18px;font-weight:800;color:#0D47A1">#${order.id.slice(0,8).toUpperCase()}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px">Hali</div>
          <div style="font-size:13px;font-weight:700;color:#0D47A1">${statusLabel[order.status] ?? order.status}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px">Tarehe</div>
          <div style="font-size:13px;font-weight:600;color:#333">${date}</div>
        </div>
      </div>
      <div style="padding:16px 24px;border-bottom:1px solid #f0f0f0">
        <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Taarifa za Mteja</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span style="color:#0D47A1">👤</span><span style="font-weight:600;color:#1a1a1a">${order.user_name ?? '—'}</span></div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span style="color:#0D47A1">📱</span><span style="color:#444">${order.user_phone ?? '—'}</span></div>
        ${order.delivery_address ? `<div style="display:flex;gap:8px;align-items:center"><span style="color:#0D47A1">📍</span><span style="color:#444">${order.delivery_address}</span></div>` : ''}
      </div>
      <div style="padding:16px 24px 0">
        <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Bidhaa</div>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
      <div style="margin:16px 24px;background:#f8f9fa;border-radius:10px;padding:12px 16px">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:6px">
          <span>Subtotal</span><span>${formatCurrency(order.subtotal ?? 0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#0D47A1;border-top:1px solid #e5e7eb;padding-top:8px">
          <span>JUMLA YOTE</span><span>${formatCurrency(order.total ?? 0)}</span>
        </div>
      </div>
      ${order.vehicle_number ? `
      <div style="margin:0 24px 16px;background:#E3F2FD;border-radius:10px;padding:12px 16px">
        <div style="font-size:10px;color:#0D47A1;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🚌 Taarifa za Safari</div>
        <div style="display:flex;gap:16px;font-size:13px">
          <div><span style="color:#666">Gari:</span> <strong>${order.vehicle_number}</strong></div>
          <div><span style="color:#666">Kondakta:</span> <strong>${order.conductor_phone ?? '—'}</strong></div>
        </div>
      </div>` : ''}
      <div style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #f0f0f0">
        <div style="color:#999;font-size:11px">Asante kwa ununuzi wako!</div>
        <div style="color:#bbb;font-size:10px;margin-top:4px">StepX · +255 758 285 354</div>
      </div>
      <div class="no-print" style="padding:0 24px 24px;text-align:center">
        <button onclick="window.print()" style="background:#0D47A1;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%">
          🖨️ Chapisha / Pakua PDF
        </button>
      </div>
    </div></body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
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
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[120px]">
                    <span className="truncate block">{order.user_name ?? '—'}</span>
                    {order.status === 'in_transit' && order.vehicle_number && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium mt-0.5">
                        <Truck className="w-3 h-3" />{order.vehicle_number}
                      </span>
                    )}
                  </td>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); openOrder(order) }}
                        className="text-[#0D47A1] hover:text-[#0a3880] font-medium text-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); printReceipt(order) }}
                        className="text-gray-400 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                        title="Chapisha Risiti"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[#0D47A1]">
                Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
              {selectedOrder && (
                <button
                  onClick={() => printReceipt(selectedOrder)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" /> Chapisha Risiti
                </button>
              )}
            </div>
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

              {/* Safari Info Card */}
              {selectedOrder.status === 'in_transit' && !showTransitFields && (selectedOrder.vehicle_number || selectedOrder.conductor_phone) && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D47A1] to-[#1565C0] p-5 text-white shadow-lg">
                  <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
                  <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm uppercase tracking-widest text-blue-100">Taarifa za Safari</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Namba ya Gari</p>
                        <p className="font-bold">{selectedOrder.vehicle_number ?? '—'}</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Kondakta</p>
                        <p className="font-bold">{selectedOrder.conductor_phone ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Update Status */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-gray-700 text-sm">Badilisha Status</h3>

                <Select value={newStatus} onValueChange={v => setNewStatus(v as OrderStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Transit fields */}
                {showTransitFields && (
                  <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0D47A1] flex items-center justify-center">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-[#0D47A1] text-sm">Taarifa za Safari</span>
                      <span className="ml-auto text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">LAZIMA *</span>
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        placeholder="Namba ya gari (mfano: T 123 ABC)"
                        value={vehicleNumber}
                        onChange={e => setVehicleNumber(e.target.value)}
                        className="pl-9 bg-white border-blue-200 text-sm h-10"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        placeholder="Namba ya kondakta (mfano: 0712345678)"
                        value={conductorPhone}
                        onChange={e => setConductorPhone(e.target.value)}
                        className="pl-9 bg-white border-blue-200 text-sm h-10"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={updateStatus}
                  disabled={updating || (newStatus === selectedOrder.status && !showTransitFields)}
                  className="w-full bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer h-11 font-semibold"
                >
                  {updating ? 'Inahifadhi...' : showTransitFields ? 'Tuma Safari' : 'Sasisha Status'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
