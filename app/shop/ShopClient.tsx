'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import {
  ShoppingCart, X, Plus, Minus, Search, ChevronRight,
  CheckCircle2, Package, Phone, MapPin, Truck, ArrowLeft,
  Building2, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { submitGuestOrder } from './actions'
import type { Product, Transporter, Location } from '@/lib/types'

interface CartItem {
  product_id: string
  product_name: string
  size: string
  quantity: number
  price: number       // wholesale_price × totalPcs — bei ya mfuko mzima
  image?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Zote', yebo: 'Yebo', sendo: 'Sendo',
  mabuti: 'Mabuti', ndara: 'Ndara', boti_boti: 'Boti Boti',
}

const WHATSAPP_NUMBER = '255758285354'

function getSizeRange(product: Product): string {
  const keys = Object.keys(product.stock ?? {}).filter(k => (product.stock[k] ?? 0) > 0)
  if (keys.length === 0) return ''
  // Numeric sizes
  const nums = keys.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
  if (nums.length > 0) {
    return nums.length === 1 ? `${nums[0]}` : `${nums[0]} - ${nums[nums.length - 1]}`
  }
  // Letter sizes — keep original order
  return keys.length === 1 ? keys[0] : `${keys[0]} - ${keys[keys.length - 1]}`
}

export default function ShopClient({
  products,
  transporters = [],
  locations = [],
}: {
  products: Product[]
  transporters?: Transporter[]
  locations?: Location[]
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [step, setStep] = useState<'browse' | 'checkout' | 'success'>('browse')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [receiptCart, setReceiptCart] = useState<CartItem[]>([])
  const [receiptForm, setReceiptForm] = useState({ name: '', phone: '', address: '' })

  // Transport state
  const [selectedTransporterId, setSelectedTransporterId] = useState('__manual__')
  const [transportCompany, setTransportCompany] = useState('')
  const [transportPhone, setTransportPhone] = useState('')
  const [transitLocation, setTransitLocation] = useState('')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const locationRef = useRef<HTMLDivElement>(null)

  const filteredLocations = useMemo(() =>
    locations.filter(l => l.name.toLowerCase().includes(transitLocation.toLowerCase()) && transitLocation.length > 0),
    [locations, transitLocation]
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleTransporterSelect(id: string) {
    setSelectedTransporterId(id)
    if (id === '__manual__') {
      setTransportCompany('')
      setTransportPhone('')
    } else {
      const t = transporters.find(t => t.id === id)
      if (t) { setTransportCompany(t.name); setTransportPhone(t.phone ?? '') }
    }
  }

  function resetTransport() {
    setSelectedTransporterId('__manual__')
    setTransportCompany('')
    setTransportPhone('')
    setTransitLocation('')
    setLocationDropdownOpen(false)
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
    return ['all', ...cats]
  }, [products])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      const matchCat = category === 'all' || p.category === category
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [products, search, category])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  function addToCart(product: Product) {
    const size = getSizeRange(product) || 'N/A'
    const totalPcs = Object.values(product.stock ?? {}).reduce((s, v) => s + (v ?? 0), 0)
    const bagPrice = Number(product.wholesale_price) * totalPcs
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        size,
        quantity: 1,
        price: bagPrice,
        image: product.images?.[0],
      }]
    })
    toast.success(`${product.name} imeongezwa kwenye mfuko!`)
  }

  function changeQty(product_id: string, size: string, delta: number) {
    setCart(prev =>
      prev
        .map(i => i.product_id === product_id && i.size === size ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    )
  }

  function downloadReceipt(id: string, items: CartItem[], total: number, customer: { name: string; phone: string; address: string }) {
    const date = new Date().toLocaleDateString('en-GB')
    const rows = items.map(i => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">
          <div style="font-weight:600;color:#1a1a1a">${i.product_name}</div>
          <div style="color:#888;font-size:12px;margin-top:2px">Saizi: ${i.size} &nbsp;·&nbsp; Vifurushi: ${i.quantity}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#0D47A1;white-space:nowrap">
          ${formatCurrency(i.price * i.quantity)}
        </td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Risiti - StepX #${id}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;display:flex;justify-content:center;padding:30px}
        .card{background:#fff;width:420px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
        @media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0;width:100%}.no-print{display:none}}
      </style>
    </head><body>
      <div class="card">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0D47A1,#1976D2);padding:28px 24px;text-align:center">
          <div style="font-size:28px;margin-bottom:6px">👟</div>
          <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px">StepX</div>
          <div style="color:#90CAF9;font-size:12px;margin-top:4px;text-transform:uppercase;letter-spacing:2px">Risiti ya Ununuzi</div>
        </div>

        <!-- Order ID -->
        <div style="background:#E3F2FD;padding:14px 24px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px">Order ID</div>
            <div style="font-size:18px;font-weight:800;color:#0D47A1">#${id}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px">Tarehe</div>
            <div style="font-size:14px;font-weight:600;color:#333">${date}</div>
          </div>
        </div>

        <!-- Customer -->
        <div style="padding:16px 24px;border-bottom:1px solid #f0f0f0">
          <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Taarifa za Mteja</div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <span style="color:#0D47A1">👤</span>
            <span style="font-weight:600;color:#1a1a1a">${customer.name}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <span style="color:#0D47A1">📱</span>
            <span style="color:#444">${customer.phone}</span>
          </div>
          ${customer.address ? `<div style="display:flex;gap:8px;align-items:center">
            <span style="color:#0D47A1">📍</span>
            <span style="color:#444">${customer.address}</span>
          </div>` : ''}
        </div>

        <!-- Items -->
        <div style="padding:16px 24px 0">
          <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Bidhaa</div>
          <table style="width:100%;border-collapse:collapse">${rows}</table>
        </div>

        <!-- Total -->
        <div style="margin:0 24px 24px;background:linear-gradient(135deg,#0D47A1,#1976D2);border-radius:12px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
          <div style="color:#90CAF9;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Jumla Yote</div>
          <div style="color:#fff;font-size:22px;font-weight:800">${formatCurrency(total)}</div>
        </div>

        <!-- Footer -->
        <div style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #f0f0f0">
          <div style="color:#999;font-size:11px">Asante kwa ununuzi wako!</div>
          <div style="color:#bbb;font-size:10px;margin-top:4px">StepX · +255 758 285 354</div>
        </div>

        <!-- Print Button -->
        <div class="no-print" style="padding:0 24px 24px;text-align:center">
          <button onclick="window.print()" style="background:#0D47A1;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;width:100%">
            📄 Pakua / Chapisha PDF
          </button>
        </div>
      </div>
    </body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  async function placeOrder() {
    if (!form.name.trim()) { toast.error('Weka jina lako'); return }
    if (!form.phone.trim()) { toast.error('Weka namba ya simu'); return }
    setSubmitting(true)
    try {
      const finalCompany = selectedTransporterId !== '__manual__'
        ? transporters.find(t => t.id === selectedTransporterId)?.name ?? transportCompany
        : transportCompany
      const finalPhone = selectedTransporterId !== '__manual__'
        ? transporters.find(t => t.id === selectedTransporterId)?.phone ?? transportPhone
        : transportPhone

      const id = await submitGuestOrder({
        user_name: form.name,
        user_phone: form.phone,
        delivery_address: form.address,
        items: cart.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          size: i.size,
          quantity: i.quantity,
          price: i.price,
        })),
        subtotal,
        total: subtotal,
        transport_company: finalCompany || undefined,
        transport_phone: finalPhone || undefined,
        transit_location: transitLocation || undefined,
      })
      const shortId = id.slice(0, 8).toUpperCase()

      // Build WhatsApp message
      const itemLines = cart.map(i =>
        `• ${i.product_name} (Size: ${i.size}) ×${i.quantity} — ${formatCurrency(i.price * i.quantity)}`
      ).join('\n')
      const transportLine = finalCompany
        ? `\n🚚 *Usafiri:* ${finalCompany}${finalPhone ? ` · ${finalPhone}` : ''}${transitLocation ? `\n📍 *Location:* ${transitLocation}` : ''}`
        : transitLocation ? `\n📍 *Location:* ${transitLocation}` : ''
      const msg =
        `🛍️ *ORDER MPYA - StepX*\n\n` +
        `📋 *Order ID:* #${shortId}\n` +
        `👤 *Mteja:* ${form.name}\n` +
        `📱 *Simu:* ${form.phone}\n` +
        `📍 *Delivery:* ${form.address || 'Haijawekwa'}` +
        transportLine +
        `\n\n*Bidhaa:*\n${itemLines}\n\n` +
        `💰 *JUMLA: ${formatCurrency(subtotal)}*\n\n` +
        `📅 *Tarehe:* ${new Date().toLocaleDateString('en-GB')}`
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')

      setReceiptCart([...cart])
      setReceiptForm({ name: form.name, phone: form.phone, address: form.address })
      setOrderId(shortId)
      setStep('success')
      setCart([])
      resetTransport()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Kuna tatizo. Jaribu tena.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────
  if (step === 'success') {
    const receiptTotal = receiptCart.reduce((s, i) => s + i.price * i.quantity, 0)
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Order Imetumwa!</h2>
            <p className="text-gray-500 text-sm mt-2">Asante kwa ununuzi wako</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Order ID yako</p>
            <p className="text-2xl font-bold text-[#0D47A1] mt-1">#{orderId}</p>
          </div>
          <p className="text-gray-400 text-xs">Order imepelekwa WhatsApp — tutawasiliana nawe hivi karibuni.</p>

          <button
            onClick={() => downloadReceipt(orderId, receiptCart, receiptTotal, receiptForm)}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl cursor-pointer transition-all"
          >
            <Package className="w-5 h-5" /> Pakua Risiti (PDF)
          </button>

          <Button
            onClick={() => { setStep('browse'); setForm({ name: '', phone: '', address: '' }); resetTransport() }}
            className="w-full bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer"
          >
            Rudi Dukani
          </Button>
        </div>
      </div>
    )
  }

  // ── CHECKOUT ──────────────────────────────────────────────────────────
  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#0D47A1] text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
          <button onClick={() => setStep('browse')} className="cursor-pointer p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Maliza Ununuzi</h1>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-32">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">Bidhaa Ulizochagua</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {cart.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {item.image
                      ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500">Size {item.size} · x{item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm flex-shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-blue-50 flex justify-between items-center">
              <span className="font-bold text-gray-800">Jumla</span>
              <span className="font-bold text-[#0D47A1] text-xl">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Taarifa Zako</h2>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Jina lako kamili *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="pl-10" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Namba ya simu *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="pl-10" type="tel" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Anwani ya delivery (optional)" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="pl-10" />
            </div>
          </div>

          {/* Transport / Delivery */}
          <div className="rounded-2xl border-2 border-blue-100 bg-gradient-to-b from-blue-50/60 to-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0D47A1] flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-[#0D47A1] text-sm">Usafiri wa Bidhaa</p>
                <p className="text-[10px] text-gray-400">Chagua kampuni au andika mkononi (si lazima)</p>
              </div>
            </div>

            {/* Transporter select — only if any exist */}
            {transporters.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Kampuni ya Usafiri
                </p>
                <div className="relative">
                  <select
                    value={selectedTransporterId}
                    onChange={e => handleTransporterSelect(e.target.value)}
                    className="w-full h-10 rounded-xl border border-blue-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] appearance-none cursor-pointer"
                  >
                    <option value="__manual__">— Andika mkononi —</option>
                    {transporters.map(t => (
                      <option key={t.id} value={t.id}>{t.name}{t.phone ? ` · ${t.phone}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Manual fields — shown when "manual" selected or no transporters */}
            {(selectedTransporterId === '__manual__') && (
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Jina la kampuni"
                    value={transportCompany}
                    onChange={e => setTransportCompany(e.target.value)}
                    className="pl-9 border-blue-200 text-sm h-10"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Namba ya simu"
                    value={transportPhone}
                    onChange={e => setTransportPhone(e.target.value)}
                    className="pl-9 border-blue-200 text-sm h-10"
                    type="tel"
                  />
                </div>
              </div>
            )}

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
                  className="pl-9 border-blue-200 text-sm h-10"
                />
                {locationDropdownOpen && filteredLocations.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-blue-100 shadow-xl z-50 overflow-hidden max-h-44 overflow-y-auto">
                    {filteredLocations.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onMouseDown={() => { setTransitLocation(loc.name); setLocationDropdownOpen(false) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-2.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#0D47A1] flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{loc.name}</p>
                          {loc.address && <p className="text-xs text-gray-400">{loc.address}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-xl">
          <Button
            onClick={placeOrder}
            disabled={submitting}
            className="w-full bg-[#25D366] hover:bg-[#1ebe59] cursor-pointer h-14 text-base font-bold rounded-2xl gap-2"
          >
            {submitting ? 'Inatuma...' : `📲 Tuma Order WhatsApp · ${formatCurrency(subtotal)}`}
          </Button>
        </div>
      </div>
    )
  }

  // ── BROWSE ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0D47A1] text-white sticky top-0 z-30 shadow-lg">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <p className="font-bold text-base">StepX</p>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              placeholder="Tafuta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/15 border border-white/20 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/25"
            />
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer flex-shrink-0"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF8F00] rounded-full text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {/* Categories */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                category === cat ? 'bg-white text-[#0D47A1]' : 'bg-white/15 text-white/80 hover:bg-white/25'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-3 py-4 pb-32 max-w-2xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Hakuna bidhaa zinazolingana</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(product => {
              const range = getSizeRange(product)
              const hasStock = Object.values(product.stock ?? {}).some(q => q > 0)
              const cartItem = cart.find(i => i.product_id === product.id)
              const inCart = cartItem?.quantity ?? 0

              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                  {/* Image */}
                  <div className="aspect-square bg-gray-100 relative rounded-t-2xl overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Package className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {product.is_new && (
                      <span className="absolute top-2 left-2 bg-[#FF8F00] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col gap-1">
                    {product.brand && <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{product.brand}</p>}
                    <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{product.name}</p>
                    {range && (
                      <p className="text-[11px] text-gray-500">
                        Saizi: <span className="font-semibold text-gray-700">{range}</span>
                      </p>
                    )}

                    {/* Bei ya bidhaa */}
                    <div className="bg-orange-50 rounded-lg px-2 py-1 my-0.5">
                      <p className="font-extrabold text-orange-600 text-sm leading-none">
                        {formatCurrency(Number(product.wholesale_price))}
                      </p>
                    </div>


                    {/* Add / quantity buttons */}
                    {inCart === 0 ? (
                      <button
                        disabled={!hasStock}
                        onClick={() => hasStock && addToCart(product)}
                        className={`w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          hasStock
                            ? 'bg-[#0D47A1] text-white hover:bg-[#0a3880] active:scale-95'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {hasStock ? 'Ongeza' : 'Haipatikani'}
                      </button>
                    ) : (
                      <div className="rounded-xl bg-blue-50 border border-blue-100 overflow-hidden">
                        <div className="flex items-center justify-between px-2 pt-2">
                          <button onClick={() => changeQty(product.id, cartItem!.size, -1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center cursor-pointer border border-gray-100">
                            <Minus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <span className="text-base font-extrabold text-[#0D47A1]">{inCart}x</span>
                          <button onClick={() => addToCart(product)} className="w-8 h-8 rounded-lg bg-[#0D47A1] flex items-center justify-center cursor-pointer">
                            <Plus className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                        <p className="text-center text-sm font-bold text-gray-700 py-1.5">
                          {formatCurrency(cartItem!.price * inCart)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-5 left-3 right-3 max-w-2xl mx-auto z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-[#0D47A1] text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#FF8F00] rounded-full text-[9px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="font-semibold text-sm">{cartCount} bidhaa kwenye mfuko</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">{formatCurrency(subtotal)}</span>
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>
      )}


      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setCartOpen(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Mfuko Wako</h2>
                <p className="text-xs text-gray-400">{cartCount} bidhaa</p>
              </div>
              <button onClick={() => setCartOpen(false)} className="cursor-pointer w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Mfuko uko tupu</p>
                </div>
              ) : (
                cart.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    <div className="w-14 h-14 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                      {item.image
                        ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-500">Size {item.size}</p>
                      <p className="text-[#0D47A1] font-bold text-sm mt-0.5">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => changeQty(item.product_id, item.size, -1)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center cursor-pointer">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => changeQty(item.product_id, item.size, 1)} className="w-7 h-7 rounded-lg bg-[#0D47A1] flex items-center justify-center cursor-pointer">
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Jumla ya Bidhaa</span>
                  <span className="font-bold text-2xl text-[#0D47A1]">{formatCurrency(subtotal)}</span>
                </div>
                <Button
                  onClick={() => { setCartOpen(false); setStep('checkout') }}
                  className="w-full bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer h-14 text-base font-bold rounded-2xl"
                >
                  Endelea Kununua <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
