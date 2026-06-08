'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { updateOrderStatus } from './actions'
import { Search, Download, Eye, Truck, Phone, Hash, Printer, MapPin, Building2, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS,
  PAYMENT_LABELS, ORDER_STATUSES
} from '@/lib/utils'
import type { Order, OrderStatus, Transporter, Location } from '@/lib/types'

interface Props {
  initialOrders: Order[]
  transporters: Transporter[]
  locations: Location[]
}

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function OrdersClient({ initialOrders, transporters, locations }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [conductorPhone, setConductorPhone] = useState('')
  const [selectedTransporterId, setSelectedTransporterId] = useState('__manual__')
  const [transportCompany, setTransportCompany] = useState('')
  const [transportPhone, setTransportPhone] = useState('')
  const [transitLocation, setTransitLocation] = useState('')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const locationRef = useRef<HTMLDivElement>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredLocations = useMemo(() =>
    locations.filter(l => l.name.toLowerCase().includes(transitLocation.toLowerCase()) ||
      l.address.toLowerCase().includes(transitLocation.toLowerCase())),
    [locations, transitLocation]
  )

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
    setTransportCompany(order.transport_company ?? '')
    setTransportPhone(order.transport_phone ?? '')
    setTransitLocation(order.transit_location ?? '')
    setSelectedTransporterId('__manual__')
  }

  const showTransitFields = newStatus === 'in_transit'

  function handleTransporterSelect(id: string) {
    setSelectedTransporterId(id)
    if (id === '__manual__') {
      setTransportCompany('')
      setTransportPhone('')
    } else {
      const t = transporters.find(t => t.id === id)
      if (t) { setTransportCompany(t.name); setTransportPhone(t.phone) }
    }
  }

  async function updateStatus() {
    if (!selectedOrder) return
    if (showTransitFields && (!vehicleNumber.trim() || !conductorPhone.trim())) {
      toast.error('Weka namba ya gari na namba ya kondakta!')
      return
    }
    setUpdating(true)
    try {
      const extra = showTransitFields ? {
        vehicle_number: vehicleNumber.trim(),
        conductor_phone: conductorPhone.trim(),
        transport_company: transportCompany.trim(),
        transport_phone: transportPhone.trim(),
        transit_location: transitLocation.trim(),
      } : undefined
      await updateOrderStatus(selectedOrder.id, newStatus, extra)
      const updatedOrder = { ...selectedOrder, status: newStatus, ...(extra ?? {}) }
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

  const statusMeta: Record<string, { dot: string; tab: string }> = {
    all:        { dot: 'bg-gray-400',   tab: 'bg-gray-100 text-gray-600' },
    pending:    { dot: 'bg-orange-400', tab: 'bg-orange-100 text-orange-700' },
    confirmed:  { dot: 'bg-blue-400',   tab: 'bg-blue-100 text-blue-700' },
    processing: { dot: 'bg-purple-400', tab: 'bg-purple-100 text-purple-700' },
    in_transit: { dot: 'bg-teal-400',   tab: 'bg-teal-100 text-teal-700' },
    delivered:  { dot: 'bg-green-400',  tab: 'bg-green-100 text-green-700' },
    cancelled:  { dot: 'bg-red-400',    tab: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-5 pb-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} kati ya {orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" className="gap-2 cursor-pointer h-9 text-sm border-gray-200">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── QUICK STATS ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {(['pending','confirmed','processing','in_transit','delivered','cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveTab(s)}
            className={`rounded-xl px-3 py-2.5 text-center cursor-pointer transition-all border ${
              activeTab === s
                ? 'border-[#0D47A1] bg-[#0D47A1] text-white shadow-md'
                : 'border-gray-100 bg-white hover:border-gray-300 text-gray-700'
            }`}
          >
            <p className={`text-xl font-extrabold ${activeTab === s ? 'text-white' : 'text-gray-800'}`}>
              {countByStatus(s)}
            </p>
            <p className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${activeTab === s ? 'text-blue-100' : 'text-gray-400'}`}>
              {STATUS_LABELS[s]}
            </p>
          </button>
        ))}
      </div>

      {/* ── SEARCH + ALL TAB ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Tafuta jina, simu, au order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-gray-200 h-10"
          />
        </div>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 h-10 rounded-lg text-sm font-semibold cursor-pointer transition-all border ${
            activeTab === 'all'
              ? 'bg-[#0D47A1] text-white border-[#0D47A1]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          Zote ({orders.length})
        </button>
      </div>

      {/* ── ORDERS CARDS LIST ── */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
            <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Hakuna orders zinazolingana</p>
          </div>
        ) : filtered.map(order => (
          <div
            key={order.id}
            onClick={() => openOrder(order)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0D47A1]/20 transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0D47A1] to-[#1976D2] flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-bold text-sm">{(order.user_name ?? '??').slice(0,2).toUpperCase()}</span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800 text-sm">{order.user_name ?? '—'}</p>
                  {order.status === 'in_transit' && order.transport_company && (
                    <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                      <Truck className="w-2.5 h-2.5" />{order.transport_company}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">#{order.id.slice(0,8).toUpperCase()}</span>
                  <span className="text-xs text-gray-400">{order.user_phone ?? ''}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{totalItems(order.items)} bidhaa</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="font-extrabold text-gray-800 text-base">{formatCurrency(order.total ?? 0)}</p>
                </div>
                <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta[order.status]?.dot ?? 'bg-gray-400'}`} />
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); openOrder(order) }}
                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-[#0D47A1] cursor-pointer transition-colors"
                    title="Angalia Order"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); printReceipt(order) }}
                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 cursor-pointer transition-colors"
                    title="Chapisha Risiti"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            {/* Mobile total + status bar */}
            <div className="sm:hidden flex items-center justify-between px-5 pb-3 -mt-1">
              <p className="font-extrabold text-[#0D47A1]">{formatCurrency(order.total ?? 0)}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 overflow-hidden">
          {/* Gradient header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#0D47A1] to-[#1976D2] px-6 py-5 text-white flex-shrink-0">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute right-10 -bottom-10 w-24 h-24 rounded-full bg-white/5" />
            <DialogHeader className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-extrabold text-sm">
                      {(selectedOrder?.user_name ?? '??').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <DialogTitle className="text-white text-lg font-bold">
                      {selectedOrder?.user_name ?? '—'}
                    </DialogTitle>
                    <p className="text-blue-200 text-xs mt-0.5 font-mono">
                      #{selectedOrder?.id.slice(0, 8).toUpperCase()} · {selectedOrder ? formatDate(selectedOrder.created_at) : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${selectedOrder ? STATUS_COLORS[selectedOrder.status] : ''}`}>
                    {selectedOrder ? (STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status) : ''}
                  </span>
                  <p className="font-extrabold text-white text-lg">{formatCurrency(selectedOrder?.total ?? 0)}</p>
                </div>
              </div>
            </DialogHeader>
          </div>

          {selectedOrder && (
            <div className="space-y-4 p-5">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '📱', label: 'Simu', value: selectedOrder.user_phone },
                  { icon: '📧', label: 'Barua Pepe', value: selectedOrder.user_email },
                  { icon: '📍', label: 'Anwani', value: selectedOrder.delivery_address },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="bg-gray-50 rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{f.icon} {f.label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Bidhaa Zilizonunuliwa</p>
                <div className="space-y-1.5">
                  {(selectedOrder.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0D47A1]/10 flex items-center justify-center text-[#0D47A1] font-bold text-xs">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{item.product_name}</p>
                          <p className="text-xs text-gray-400">Size {item.size} · x{item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2 px-4 py-3 bg-[#0D47A1]/5 rounded-xl">
                  <span className="font-bold text-gray-700">Jumla</span>
                  <span className="font-extrabold text-[#0D47A1] text-lg">{formatCurrency(selectedOrder.total ?? 0)}</span>
                </div>
              </div>

              {/* Payment Info */}
              {(selectedOrder.payment_method || selectedOrder.payment_status) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Malipo</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {selectedOrder.payment_method && (
                      <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-medium">
                        {PAYMENT_LABELS[selectedOrder.payment_method as keyof typeof PAYMENT_LABELS] ?? selectedOrder.payment_method}
                      </span>
                    )}
                    {selectedOrder.mpesa_ref && (
                      <span className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 font-mono text-xs">{selectedOrder.mpesa_ref}</span>
                    )}
                  </div>
                  {selectedOrder.payment_proof_url && (
                    <img src={selectedOrder.payment_proof_url} alt="Payment proof" className="rounded-lg max-h-40 object-cover mt-2" />
                  )}
                </div>
              )}

              {/* Print button */}
              <button
                onClick={() => printReceipt(selectedOrder)}
                className="w-full flex items-center justify-center gap-2 h-10 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-sm cursor-pointer transition-colors border border-emerald-100"
              >
                <Printer className="w-4 h-4" /> Chapisha Risiti
              </button>

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
                    <div className="grid grid-cols-2 gap-3">
                      {selectedOrder.transport_company && (
                        <div className="bg-white/10 rounded-xl p-3 col-span-2">
                          <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" />Kampuni</p>
                          <p className="font-bold">{selectedOrder.transport_company} {selectedOrder.transport_phone ? `· ${selectedOrder.transport_phone}` : ''}</p>
                        </div>
                      )}
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Namba ya Gari</p>
                        <p className="font-bold">{selectedOrder.vehicle_number ?? '—'}</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Kondakta</p>
                        <p className="font-bold">{selectedOrder.conductor_phone ?? '—'}</p>
                      </div>
                      {selectedOrder.transit_location && (
                        <div className="bg-white/10 rounded-xl p-3 col-span-2">
                          <p className="text-blue-200 text-[10px] uppercase tracking-wide mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Location</p>
                          <p className="font-bold">{selectedOrder.transit_location}</p>
                        </div>
                      )}
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
                  <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/60 to-white p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0D47A1] flex items-center justify-center">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-[#0D47A1] text-sm">Taarifa za Safari</span>
                      <span className="ml-auto text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">LAZIMA *</span>
                    </div>

                    {/* Transporter selector */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Kampuni ya Usafiri
                      </p>
                      {transporters.length > 0 && (
                        <div className="relative">
                          <select
                            value={selectedTransporterId}
                            onChange={e => handleTransporterSelect(e.target.value)}
                            className="w-full h-10 rounded-lg border border-blue-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] appearance-none cursor-pointer"
                          >
                            <option value="__manual__">— Andika mkononi —</option>
                            {transporters.map(t => (
                              <option key={t.id} value={t.id}>{t.name} {t.phone ? `· ${t.phone}` : ''}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                      {(selectedTransporterId === '__manual__') && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <Input
                              placeholder="Jina la kampuni"
                              value={transportCompany}
                              onChange={e => setTransportCompany(e.target.value)}
                              className="pl-9 bg-white border-blue-200 text-sm h-10"
                            />
                          </div>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <Input
                              placeholder="Namba ya simu"
                              value={transportPhone}
                              onChange={e => setTransportPhone(e.target.value)}
                              className="pl-9 bg-white border-blue-200 text-sm h-10"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Vehicle + Conductor */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Hash className="w-3 h-3" /> Namba ya Gari
                        </p>
                        <Input
                          placeholder="T 123 ABC"
                          value={vehicleNumber}
                          onChange={e => setVehicleNumber(e.target.value)}
                          className="bg-white border-blue-200 text-sm h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Kondakta
                        </p>
                        <Input
                          placeholder="0712345678"
                          value={conductorPhone}
                          onChange={e => setConductorPhone(e.target.value)}
                          className="bg-white border-blue-200 text-sm h-10"
                        />
                      </div>
                    </div>

                    {/* Location with autocomplete */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Location ya Delivery
                      </p>
                      <div ref={locationRef} className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 z-10" />
                        <Input
                          placeholder="Andika au chagua location..."
                          value={transitLocation}
                          onChange={e => { setTransitLocation(e.target.value); setLocationDropdownOpen(true) }}
                          onFocus={() => setLocationDropdownOpen(true)}
                          className="pl-9 bg-white border-blue-200 text-sm h-10"
                        />
                        {locationDropdownOpen && filteredLocations.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-blue-100 shadow-xl z-50 overflow-hidden max-h-44 overflow-y-auto">
                            {filteredLocations.map(loc => (
                              <button
                                key={loc.id}
                                type="button"
                                onMouseDown={() => { setTransitLocation(loc.name); setLocationDropdownOpen(false) }}
                                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-2.5 group"
                              >
                                <MapPin className="w-3.5 h-3.5 text-[#0D47A1] flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 group-hover:text-[#0D47A1]">{loc.name}</p>
                                  {loc.address && <p className="text-xs text-gray-400">{loc.address}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
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
