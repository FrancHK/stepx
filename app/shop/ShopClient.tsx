'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import {
  ShoppingCart, X, Plus, Minus, Search, ChevronRight,
  CheckCircle2, Package, Phone, MapPin, Truck, ArrowLeft,
  Building2, ChevronDown, SlidersHorizontal, Sparkles, Flame, Tag,
} from 'lucide-react'
import Image from 'next/image'
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
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterBrands, setFilterBrands] = useState<string[]>([])
  const [filterNew, setFilterNew] = useState(false)
  const [filterHot, setFilterHot] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [receiptCart, setReceiptCart] = useState<CartItem[]>([])
  const [receiptForm, setReceiptForm] = useState({ name: '', phone: '', address: '' })
  const [receiptTransport, setReceiptTransport] = useState({ company: '', location: '' })

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

  const brands = useMemo(() =>
    Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(),
    [products]
  )

  const activeFilterCount = filterBrands.length + (filterNew ? 1 : 0) + (filterHot ? 1 : 0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      const matchCat = category === 'all' || p.category === category
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
      const matchBrand = filterBrands.length === 0 || filterBrands.includes(p.brand ?? '')
      const matchNew = !filterNew || p.is_new
      const matchHot = !filterHot || p.is_trending
      return matchCat && matchQ && matchBrand && matchNew && matchHot
    })
  }, [products, search, category, filterBrands, filterNew, filterHot])

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

  function downloadReceipt(
    id: string,
    items: CartItem[],
    total: number,
    customer: { name: string; phone: string; address: string },
    transport?: { company: string; location: string }
  ) {
    const date = new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'long', year: 'numeric' })
    const rows = items.map(i => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid #f0f4f8">
          <div style="font-weight:700;color:#1a1a2e;font-size:13px">${i.product_name}</div>
          <div style="color:#888;font-size:11px;margin-top:2px">Saizi: ${i.size} &nbsp;·&nbsp; Mfuko &times;${i.quantity}</div>
        </td>
        <td style="padding:9px 0;border-bottom:1px solid #f0f4f8;text-align:right;font-weight:800;color:#0D47A1;white-space:nowrap;font-size:13px">
          ${formatCurrency(i.price * i.quantity)}
        </td>
      </tr>`).join('')

    const transportSection = (transport?.company || transport?.location) ? `
      <div style="margin-bottom:14px;background:#E8F5E9;border-radius:10px;padding:12px 14px;border-left:3px solid #4CAF50">
        <div style="font-size:9px;color:#2E7D32;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">🚚 Usafiri</div>
        ${transport.company ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#555">Kampuni</span><span style="font-weight:700;color:#1a1a2e">${transport.company}</span></div>` : ''}
        ${transport.location ? `<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#555">Location</span><span style="font-weight:700;color:#1a1a2e">${transport.location}</span></div>` : ''}
      </div>` : ''

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Risiti StepX #${id}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#e8ecf0;display:flex;justify-content:center;min-height:100vh;padding:24px}
        .receipt{background:#fff;width:360px;border-radius:4px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.15)}
        .cut{border-top:2px dashed #ddd;margin:0 16px;position:relative}
        .cut::before,.cut::after{content:'';position:absolute;top:-8px;width:14px;height:14px;background:#e8ecf0;border-radius:50%}
        .cut::before{left:-23px}.cut::after{right:-23px}
        @media print{body{background:#fff;padding:0}.receipt{box-shadow:none;width:100%;border-radius:0}.no-print{display:none}.cut::before,.cut::after{background:#fff}}
      </style>
    </head><body><div class="receipt">
      <div style="background:linear-gradient(160deg,#0D47A1 0%,#1565C0 60%,#1976D2 100%);padding:24px 20px 20px;text-align:center">
        <div style="width:48px;height:48px;background:rgba(255,255,255,.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;font-size:24px">👟</div>
        <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:2px">STEPX</div>
        <div style="color:#90CAF9;font-size:10px;margin-top:3px;letter-spacing:3px;text-transform:uppercase">Risiti ya Ununuzi</div>
        <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:20px;padding:4px 14px;margin-top:10px">
          <span style="color:#fff;font-size:16px;font-weight:900;letter-spacing:1px">#${id}</span>
        </div>
      </div>
      <div style="background:#F8FAFF;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #EEF2FF">
        <div style="font-size:11px;color:#666">&#128197; ${date}</div>
        <div style="font-size:10px;background:#E8F5E9;color:#2E7D32;font-weight:700;padding:3px 10px;border-radius:20px">&#10003; IMETUMWA</div>
      </div>
      <div style="padding:16px 20px">
        <div style="margin-bottom:14px">
          <div style="font-size:9px;color:#999;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Mteja</div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
            <span style="color:#555">Jina</span><span style="font-weight:700;color:#1a1a2e">${customer.name}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span style="color:#555">Simu</span><span style="font-weight:700;color:#1a1a2e">${customer.phone}</span>
          </div>
        </div>
        ${transportSection}
        <div style="margin-bottom:12px">
          <div style="font-size:9px;color:#999;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Bidhaa Zilizonomua</div>
          <table style="width:100%;border-collapse:collapse">${rows}</table>
        </div>
        <div style="background:linear-gradient(135deg,#0D47A1,#1565C0);border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <div>
            <div style="color:#90CAF9;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Jumla Yote</div>
            <div style="color:rgba(255,255,255,.7);font-size:10px;margin-top:2px">${items.length} aina ya bidhaa</div>
          </div>
          <div style="color:#fff;font-size:22px;font-weight:900">${formatCurrency(total)}</div>
        </div>
      </div>
      <div class="cut" style="margin:4px 20px"></div>
      <div style="padding:14px 20px 20px;text-align:center">
        <div style="font-size:11px;color:#888;margin-bottom:4px">Asante kwa ununuzi wako! &#128591;</div>
        <div style="font-size:10px;color:#aaa">StepX &nbsp;&middot;&nbsp; +255 758 285 354</div>
      </div>
      <div class="no-print" style="padding:0 20px 20px">
        <button onclick="window.print()" style="background:#0D47A1;color:#fff;border:none;padding:11px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;width:100%">
          &#128438; Chapisha / Pakua PDF
        </button>
      </div>
    </div></body></html>`

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
      const msg =
        `🛍️ *ORDER MPYA - StepX*\n\n` +
        `📋 *Order ID:* #${shortId}\n` +
        `👤 *Mteja:* ${form.name}\n` +
        `📱 *Simu:* ${form.phone}\n` +
        (transitLocation ? `📍 *Location:* ${transitLocation}\n` : '') +
        (finalCompany ? `🚚 *Usafiri:* ${finalCompany}\n` : '') +
        `\n*Bidhaa:*\n${itemLines}\n\n` +
        `💰 *JUMLA: ${formatCurrency(subtotal)}*\n\n` +
        `📅 *Tarehe:* ${new Date().toLocaleDateString('en-GB')}`
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')

      setReceiptCart([...cart])
      setReceiptForm({ name: form.name, phone: form.phone, address: form.address })
      setReceiptTransport({ company: finalCompany, location: transitLocation })
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
            onClick={() => downloadReceipt(orderId, receiptCart, receiptTotal, receiptForm, receiptTransport)}
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

          {/* Combined customer + transport form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Taarifa za Ununuzi</h2>

            {/* Name */}
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Jina lako kamili *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="pl-10" />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Namba ya simu *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="pl-10" type="tel" />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                <Truck className="w-3 h-3" /> Usafiri
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Transporter dropdown — show name only */}
            {transporters.length > 0 && (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <select
                  value={selectedTransporterId}
                  onChange={e => handleTransporterSelect(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 bg-white pl-10 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] appearance-none cursor-pointer"
                >
                  <option value="__manual__">Kampuni ya Usafiri (chagua au andika)</option>
                  {transporters.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Manual company name only */}
            {selectedTransporterId === '__manual__' && (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Jina la kampuni ya usafiri (optional)"
                  value={transportCompany}
                  onChange={e => setTransportCompany(e.target.value)}
                  className="pl-10 border-gray-200 text-sm"
                />
              </div>
            )}

            {/* Location autocomplete */}
            <div ref={locationRef} className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                placeholder="Location ya delivery (optional)"
                value={transitLocation}
                onChange={e => { setTransitLocation(e.target.value); setLocationDropdownOpen(true) }}
                onFocus={() => setLocationDropdownOpen(true)}
                className="pl-10 border-gray-200 text-sm"
              />
              {locationDropdownOpen && filteredLocations.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden max-h-44 overflow-y-auto">
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

  const CATEGORY_ICONS: Record<string, string> = {
    all: '🛍️', yebo: '👟', sendo: '👠', mabuti: '🥿', ndara: '🩴', boti_boti: '👞',
  }

  // ── BROWSE ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0F4FF]">

      {/* ── STICKY HEADER ── */}
      <div className="bg-gradient-to-r from-[#0D47A1] to-[#1976D2] sticky top-0 z-30">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Image src="/logo.png" alt="StepX" width={90} height={40} className="object-contain" priority />
          </div>
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              placeholder="Tafuta bidhaa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/15 border border-white/20 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/25 transition-colors"
            />
          </div>
          {/* Filter button */}
          <button
            onClick={() => setFilterOpen(true)}
            className="relative flex-shrink-0 w-10 h-10 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-white" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF8F00] rounded-full text-[9px] font-black flex items-center justify-center text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {/* Cart icon */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex-shrink-0 w-10 h-10 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF8F00] rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-md">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                category === cat
                  ? 'bg-white text-[#0D47A1] shadow-md scale-105'
                  : 'bg-white/15 text-white/80 hover:bg-white/25'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] ?? '📦'}</span>
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── ACTIVE FILTER PILLS ── */}
      {activeFilterCount > 0 && (
        <div className="flex gap-2 px-3 pt-2 flex-wrap">
          {filterNew && (
            <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
              <Sparkles className="w-3 h-3" /> Mpya
              <button onClick={() => setFilterNew(false)} className="ml-1 cursor-pointer hover:text-blue-900">×</button>
            </span>
          )}
          {filterHot && (
            <span className="flex items-center gap-1 bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-200">
              <Flame className="w-3 h-3" /> Inayoisha Sana
              <button onClick={() => setFilterHot(false)} className="ml-1 cursor-pointer hover:text-rose-900">×</button>
            </span>
          )}
          {filterBrands.map(b => (
            <span key={b} className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-200">
              <Tag className="w-3 h-3" /> {b}
              <button onClick={() => setFilterBrands(prev => prev.filter(x => x !== b))} className="ml-1 cursor-pointer hover:text-purple-900">×</button>
            </span>
          ))}
          <button
            onClick={() => { setFilterBrands([]); setFilterNew(false); setFilterHot(false) }}
            className="text-xs text-gray-400 hover:text-gray-600 font-semibold px-2 py-1 cursor-pointer"
          >
            Futa zote
          </button>
        </div>
      )}

      {/* ── HERO STRIP ── */}
      {!search && category === 'all' && (
        <div className="mx-3 mt-3 rounded-2xl overflow-hidden bg-gradient-to-r from-[#FF8F00] to-[#F57C00] px-5 py-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-white font-black text-lg leading-tight">Bei ya Jumla 🔥</p>
            <p className="text-orange-100 text-xs mt-0.5">Viatu bora, bei ya mfuko mzima</p>
          </div>
          <div className="text-4xl">👟</div>
        </div>
      )}

      {/* ── PRODUCTS GRID ── */}
      <div className="px-3 py-3 pb-36 max-w-2xl mx-auto">
        {search && (
          <p className="text-xs text-gray-400 mb-2 px-1">
            {filtered.length} bidhaa kwa &quot;{search}&quot;
          </p>
        )}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-gray-500 font-semibold">Hakuna bidhaa zinazolingana</p>
            <button onClick={() => { setSearch(''); setCategory('all') }} className="mt-3 text-sm text-[#0D47A1] font-bold cursor-pointer hover:underline">
              Angalia bidhaa zote
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(product => {
              const range = getSizeRange(product)
              const hasStock = Object.values(product.stock ?? {}).some(q => q > 0)
              const cartItem = cart.find(i => i.product_id === product.id)
              const inCart = cartItem?.quantity ?? 0

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm border border-white flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Image — portrait ratio */}
                  <div className="relative overflow-hidden bg-gray-100 aspect-square">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => setZoomedImage(product.images[0])}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100">
                        <span className="text-4xl">👟</span>
                        <p className="text-[10px] text-gray-300 font-medium">Hakuna Picha</p>
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.is_new && (
                        <span className="bg-[#FF8F00] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">NEW</span>
                      )}
                      {product.is_trending && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">🔥 HOT</span>
                      )}
                    </div>
                    {!hasStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">Imekwisha</span>
                      </div>
                    )}
                    {inCart > 0 && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#0D47A1] rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white text-[10px] font-black">{inCart}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    {product.brand && (
                      <p className="text-[9px] text-[#0D47A1] uppercase tracking-widest font-bold">{product.brand}</p>
                    )}
                    <p className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{product.name}</p>
                    {range && (
                      <p className="text-[10px] text-gray-400">
                        Saizi <span className="font-bold text-gray-600">{range}</span>
                      </p>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-1.5 mt-auto pt-1">
                      <div className="flex-1 bg-gradient-to-r from-orange-50 to-orange-50/50 rounded-lg px-2 py-1.5 border border-orange-100">
                        <p className="text-[8px] text-orange-400 font-bold uppercase tracking-wide leading-none mb-0.5">Bei ya Mfuko</p>
                        <p className="font-black text-orange-600 text-sm leading-none">
                          {formatCurrency(Number(product.wholesale_price))}
                        </p>
                      </div>
                    </div>

                    {/* Add / quantity */}
                    {inCart === 0 ? (
                      <button
                        disabled={!hasStock}
                        onClick={() => hasStock && addToCart(product)}
                        className={`w-full py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-0.5 ${
                          hasStock
                            ? 'bg-[#0D47A1] text-white hover:bg-[#0a3880] active:scale-95 shadow-sm shadow-blue-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {hasStock ? <><ShoppingCart className="w-3.5 h-3.5" /> Ongeza Mfukoni</> : 'Haipatikani'}
                      </button>
                    ) : (
                      <div className="mt-0.5 rounded-xl bg-blue-50 border border-blue-100 overflow-hidden">
                        <div className="flex items-center justify-between px-2 py-1.5">
                          <button
                            onClick={() => changeQty(product.id, cartItem!.size, -1)}
                            className="w-7 h-7 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <div className="text-center">
                            <span className="text-sm font-black text-[#0D47A1]">{inCart}x</span>
                            <p className="text-[10px] text-gray-500 font-semibold leading-none mt-0.5">
                              {formatCurrency(cartItem!.price * inCart)}
                            </p>
                          </div>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-7 h-7 rounded-lg bg-[#0D47A1] flex items-center justify-center cursor-pointer shadow-sm"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CART FAB ── */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-5 left-3 right-3 max-w-lg mx-auto z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-gradient-to-r from-[#0D47A1] to-[#1565C0] text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl shadow-blue-900/30 cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center relative flex-shrink-0">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF8F00] rounded-full text-[9px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <div>
                <p className="font-bold text-sm">{cartCount} bidhaa kwenye mfuko</p>
                <p className="text-blue-200 text-[10px]">Bonyeza kukamilisha</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-black text-base">{formatCurrency(subtotal)}</span>
              <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── IMAGE LIGHTBOX ── */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center cursor-pointer transition-colors z-10"
            onClick={() => setZoomedImage(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={zoomedImage}
            alt="Picha kubwa"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── FILTER DRAWER ── */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setFilterOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-md shadow-2xl pb-safe"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <div>
                <h2 className="font-black text-gray-800 text-xl">Chuja Bidhaa</h2>
                {activeFilterCount > 0 && (
                  <p className="text-xs text-[#0D47A1] font-bold mt-0.5">{activeFilterCount} filter {activeFilterCount === 1 ? 'imechaguliwa' : 'zimechaguliwa'}</p>
                )}
              </div>
              <button onClick={() => setFilterOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 pb-8 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Quick filters */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Aina ya Bidhaa</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterNew(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all border-2 ${
                      filterNew
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" /> Mpya
                  </button>
                  <button
                    onClick={() => setFilterHot(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all border-2 ${
                      filterHot
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'
                    }`}
                  >
                    <Flame className="w-4 h-4" /> Inayoisha Sana 🔥
                  </button>
                </div>
              </div>

              {/* Brand filter */}
              {brands.length > 0 && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Lika (Brand)</p>
                  <div className="flex gap-2 flex-wrap">
                    {brands.map(brand => {
                      const active = filterBrands.includes(brand)
                      return (
                        <button
                          key={brand}
                          onClick={() => setFilterBrands(prev =>
                            active ? prev.filter(b => b !== brand) : [...prev, brand]
                          )}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all border-2 ${
                            active
                              ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <Tag className="w-3.5 h-3.5" /> {brand}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Category filter */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Aina ya Bidhaa</p>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all border-2 ${
                        category === cat
                          ? 'bg-[#0D47A1] text-white border-[#0D47A1] shadow-md shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {CATEGORY_ICONS[cat] ?? '📦'} {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setFilterBrands([]); setFilterNew(false); setFilterHot(false); setCategory('all') }}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  Futa Filters
                </button>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[#0D47A1] text-white text-sm font-bold cursor-pointer hover:bg-[#0a3880] transition-colors shadow-md shadow-blue-200"
                >
                  Angalia {filtered.length} Bidhaa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

            <div className="flex items-center justify-between px-5 pt-2 pb-4 flex-shrink-0">
              <div>
                <h2 className="font-black text-gray-800 text-xl">🛍️ Mfuko Wako</h2>
                <p className="text-xs text-gray-400 mt-0.5">{cartCount} bidhaa · {formatCurrency(subtotal)}</p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="cursor-pointer w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-2.5 pb-2">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🛒</div>
                  <p className="text-gray-400 font-semibold">Mfuko uko tupu</p>
                  <button onClick={() => setCartOpen(false)} className="mt-2 text-sm text-[#0D47A1] font-bold cursor-pointer">
                    Endelea kununua →
                  </button>
                </div>
              ) : cart.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                    {item.image
                      ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">👟</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400">Size {item.size}</p>
                    <p className="text-[#0D47A1] font-black text-sm mt-0.5">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => changeQty(item.product_id, item.size, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      <Minus className="w-3 h-3 text-gray-500" />
                    </button>
                    <span className="w-5 text-center text-sm font-black text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => changeQty(item.product_id, item.size, 1)}
                      className="w-7 h-7 rounded-lg bg-[#0D47A1] flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="px-4 pb-8 pt-4 border-t border-gray-100 flex-shrink-0 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Jumla ya Bidhaa</span>
                  <span className="font-black text-2xl text-[#0D47A1]">{formatCurrency(subtotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setStep('checkout') }}
                  className="w-full bg-gradient-to-r from-[#0D47A1] to-[#1565C0] hover:from-[#0a3880] hover:to-[#0D47A1] cursor-pointer h-14 text-base font-black rounded-2xl text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
                >
                  Endelea Kununua <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
