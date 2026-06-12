'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Plus, Loader2, Package, Tag, DollarSign,
  Layers, ImageIcon, Settings2, X, CloudUpload, Upload
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Product, Brand, Category, AgeGroup, Gender } from '@/lib/types'
import { CATEGORY_LABELS, AGE_GROUP_LABELS, GENDER_LABELS } from '@/lib/utils'

interface Props {
  open: boolean
  product: Product | null
  brands: Brand[]
  onClose: () => void
  onSaved: (product: Product, isNew: boolean) => void
}

const EMPTY: Omit<Product, 'id' | 'created_at'> = {
  name: '', brand: '', category: 'yebo', description: '',
  wholesale_price: 0, retail_price: 0, stock: {}, images: [],
  active: true, age_group: 'kijana', color: {}, size_type: 'single',
  is_trending: false, is_new: false, gender: 'zote',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-[#0D47A1]/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-[#0D47A1]" />
      </div>
      <span className="text-xs font-bold text-[#0D47A1] uppercase tracking-widest">{title}</span>
      <div className="flex-1 h-px bg-blue-100" />
    </div>
  )
}

interface UploadedImage {
  url: string
  name: string
  uploading?: boolean
  error?: boolean
  local?: string
}

export default function ProductFormModal({ open, product, brands, onClose, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [rangeQty, setRangeQty] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!product

  const from = parseInt(rangeFrom) || 0
  const to = parseInt(rangeTo) || 0
  const qty = parseInt(rangeQty) || 0
  const sizeCount = (from > 0 && to >= from) ? (to - from + 1) : 0
  const totalPcs = qty
  const qtyFloor = sizeCount > 0 ? Math.floor(totalPcs / sizeCount) : 0
  const remainder = sizeCount > 0 ? totalPcs % sizeCount : 0
  const sizeList = sizeCount > 0 ? Array.from({ length: sizeCount }, (_, i) => from + i) : []

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name, brand: product.brand, category: product.category,
        description: product.description, wholesale_price: product.wholesale_price,
        retail_price: product.retail_price, stock: product.stock ?? {},
        images: product.images ?? [], active: product.active, age_group: product.age_group,
        color: product.color ?? {}, size_type: product.size_type,
        is_trending: product.is_trending, is_new: product.is_new,
        gender: product.gender ?? 'zote',
      })
      const keys = Object.keys(product.stock ?? {}).map(Number).filter(Boolean).sort((a, b) => a - b)
      const perSize = keys.length > 0 ? Number((product.stock ?? {})[String(keys[0])]) : 0
      setRangeFrom(keys.length > 0 ? String(keys[0]) : '')
      setRangeTo(keys.length > 0 ? String(keys[keys.length - 1]) : '')
      setRangeQty(keys.length > 0 && perSize > 0 ? String(perSize * keys.length) : '')
      setImages((product.images ?? []).map(url => ({ url, name: url.split('/').pop() ?? 'picha' })))
    } else {
      setForm(EMPTY)
      setRangeFrom('')
      setRangeTo('')
      setRangeQty('')
      setImages([])
    }
  }, [product, open])

  function set<K extends keyof typeof EMPTY>(key: K, value: typeof EMPTY[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function compressImage(file: File): Promise<File> {
    const MAX_DIM = 1200
    const QUALITY = 0.82
    return new Promise(resolve => {
      const img = new Image()
      const blobUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(blobUrl)
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', QUALITY)
      }
      img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file) }
      img.src = blobUrl
    })
  }

  async function uploadFile(file: File): Promise<string | null> {
    const compressed = await compressImage(file)
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const supabase = createClient()
    const { error } = await supabase.storage.from('products').upload(path, compressed, {
      contentType: 'image/jpeg', upsert: false,
    })
    if (error) {
      toast.error(`Kosa la kupakia: ${error.message}`)
      return null
    }
    return `${SUPABASE_URL}/storage/v1/object/public/products/${path}`
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!fileArr.length) return
    const startIdx = images.length
    const newEntries: UploadedImage[] = fileArr.map(f => ({
      url: '', name: f.name, uploading: true, local: URL.createObjectURL(f),
    }))
    setImages(prev => [...prev, ...newEntries])
    const results = await Promise.all(
      fileArr.map((file, i) => uploadFile(file).then(url => ({ idx: startIdx + i, url })))
    )
    setImages(prev => {
      const next = [...prev]
      results.forEach(({ idx, url }) => {
        if (next[idx]) {
          next[idx] = url
            ? { ...next[idx], url, uploading: false }
            : { ...next[idx], uploading: false, error: true }
        }
      })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  function removeImage(index: number) {
    setImages(prev => {
      const img = prev[index]
      if (img?.local) URL.revokeObjectURL(img.local)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSave() {
    if (!form.name || !form.brand) { toast.error('Jaza jina na brand.'); return }
    if (images.some(i => i.uploading)) { toast.error('Subiri picha ziishe kupakiwa.'); return }
    if (sizeCount === 0) { toast.error('Weka namba za saizi sahihi.'); return }
    setSaving(true)
    try {
      const stock: Record<string, number> = {}
      sizeList.forEach((size, idx) => { stock[String(size)] = idx < remainder ? qtyFloor + 1 : qtyFloor })
      const finalImages = images.filter(i => i.url && !i.error).map(i => i.url)
      const payload = { ...form, stock, images: finalImages }
      const supabase = createClient()
      if (isEdit && product) {
        const { data, error } = await supabase.from('products').update(payload).eq('id', product.id).select().single()
        if (error) throw error
        onSaved(data as Product, false)
        toast.success('Product imesasishwa!')
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single()
        if (error) throw error
        onSaved(data as Product, true)
        toast.success('Product imeongezwa!')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? JSON.stringify(err)
      toast.error(msg, { duration: 8000 })
    } finally {
      setSaving(false)
    }
  }

  const uploadingCount = images.filter(i => i.uploading).length

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[96vw] sm:max-w-[96vw] w-[1500px] h-[97vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl shadow-2xl border-0">

        {/* ── HEADER ── */}
        <DialogHeader className="flex-shrink-0 px-8 py-4 bg-gradient-to-r from-[#0D47A1] via-[#1565C0] to-[#1976D2] relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'30\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          <div className="relative flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white text-lg font-bold tracking-tight">
                {isEdit ? 'Hariri Bidhaa' : 'Ongeza Bidhaa Mpya'}
              </DialogTitle>
              <p className="text-blue-200 text-xs mt-0.5 font-medium">
                {isEdit ? 'Sasisha taarifa za bidhaa iliyopo kwenye duka' : 'Jaza fomu hii kuongeza bidhaa mpya kwenye duka'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200/80 bg-white/10 border border-white/15 rounded-full px-3 py-1 backdrop-blur-sm flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {isEdit ? 'Hali ya Kuhariri' : 'Bidhaa Mpya'}
            </div>
          </div>
        </DialogHeader>

        {/* ── BODY: two columns ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden bg-[#F8FAFC]">

          {/* LEFT COLUMN */}
          <div className="flex flex-col w-[55%] border-r border-slate-200/70 overflow-hidden">
            <div className="flex-1 px-6 py-4 space-y-3">

              {/* ══ TAARIFA ZA MSINGI — Premium Card ══ */}
              <div className="bg-white rounded-2xl border border-blue-100/80 shadow-[0_2px_16px_rgba(13,71,161,0.07)] overflow-hidden">

                {/* Gradient header */}
                <div className="relative px-5 py-3 overflow-hidden bg-gradient-to-r from-[#0D47A1]/8 via-[#1565C0]/4 to-transparent border-b border-blue-100/60">
                  <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#E3F2FD]/60 to-transparent" />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#0D47A1]/6 blur-xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D47A1] to-[#1976D2] flex items-center justify-center shadow-lg shadow-blue-300/40 flex-shrink-0">
                      <Tag className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0D47A1] uppercase tracking-widest">Taarifa za Msingi</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Jina, brand, aina na maelezo ya bidhaa</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">

                  {/* ─ Row 1: Jina + Brand ─ */}
                  <div className="grid grid-cols-2 gap-4">

                    {/* Jina la Bidhaa */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0D47A1] flex-shrink-0" />
                        Jina la Bidhaa <span className="text-red-400 normal-case font-semibold ml-0.5">*</span>
                      </label>
                      <div className="relative group">
                        <Input
                          value={form.name}
                          onChange={e => set('name', e.target.value)}
                          placeholder="mfano: Nike Air Max 270"
                          className="h-11 pl-4 pr-9 rounded-xl border-slate-200 bg-slate-50/60 text-sm
                            hover:border-[#0D47A1]/40 hover:bg-white
                            focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 focus:bg-white
                            transition-all duration-200 shadow-sm placeholder:text-slate-300"
                        />
                        {form.name && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-200 transition-all duration-300" />
                        )}
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                        Brand <span className="text-red-400 normal-case font-semibold ml-0.5">*</span>
                      </label>
                      <Select value={form.brand} onValueChange={v => set('brand', v ?? '')}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm
                          hover:border-[#0D47A1]/40 hover:bg-white
                          focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10
                          transition-all duration-200 shadow-sm">
                          <SelectValue placeholder="Chagua brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.length === 0 && (
                            <div className="px-3 py-2 text-xs text-slate-400">Hakuna brands — ongeza kwenye sehemu ya Brands</div>
                          )}
                          {brands.map(b => (
                            <SelectItem key={b.id} value={b.name} className="text-sm">{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ─ Row 2: Kategoria + Umri + Jinsia — grouped chip panel ─ */}
                  <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50/80 to-blue-50/30 p-3 grid grid-cols-3 gap-3">

                    {/* Kategoria */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="w-4 h-4 rounded-md bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        </span>
                        Kategoria
                      </label>
                      <Select value={form.category} onValueChange={v => set('category', v as Category)}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs font-medium
                          hover:border-orange-300 hover:bg-orange-50/30
                          focus:ring-orange-200 focus:border-orange-300
                          transition-all duration-200 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Umri */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="w-4 h-4 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </span>
                        Umri
                      </label>
                      <Select value={form.age_group} onValueChange={v => set('age_group', v as AgeGroup)}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs font-medium
                          hover:border-emerald-300 hover:bg-emerald-50/30
                          focus:ring-emerald-200 focus:border-emerald-300
                          transition-all duration-200 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AGE_GROUP_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Jinsia */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="w-4 h-4 rounded-md bg-pink-100 border border-pink-200 flex items-center justify-center flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                        </span>
                        Jinsia
                      </label>
                      <Select value={form.gender} onValueChange={v => set('gender', v as Gender)}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-xs font-medium
                          hover:border-pink-300 hover:bg-pink-50/30
                          focus:ring-pink-200 focus:border-pink-300
                          transition-all duration-200 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GENDER_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ─ Row 3: Maelezo ─ */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                      Maelezo
                    </label>
                    <div className="relative group">
                      <textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        rows={2}
                        placeholder="Elezea bidhaa hii kwa undani — vifaa, rangi, ubora..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm resize-none
                          hover:border-[#0D47A1]/40 hover:bg-white
                          focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/10 focus:border-[#0D47A1] focus:bg-white
                          placeholder:text-slate-300 transition-all duration-200 shadow-sm"
                      />
                      {form.description.length > 0 && (
                        <span className="absolute bottom-2 right-3 text-[10px] text-slate-300 font-medium pointer-events-none">
                          {form.description.length}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/60">
                  <SectionTitle icon={DollarSign} title="Bei" />
                </div>
                <div className="px-5 py-3">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-slate-200">
                      <div className="px-4 py-3 space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bei ya Pc Moja</p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#0D47A1] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded pointer-events-none">TZS</span>
                          <Input
                            type="number"
                            value={form.wholesale_price || ''}
                            onChange={e => set('wholesale_price', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="pl-14 h-10 border-slate-200 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 bg-white text-sm font-semibold"
                          />
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Bei ya Mfuko Mzima {totalPcs > 0 && <span className="text-[#0D47A1]">({totalPcs} pcs)</span>}
                        </p>
                        <div className={`h-10 rounded-lg flex items-center px-4 gap-2.5 transition-colors ${
                          totalPcs > 0 && form.wholesale_price > 0
                            ? 'bg-[#0D47A1]/5 border border-[#0D47A1]/20'
                            : 'bg-slate-50 border border-slate-100'
                        }`}>
                          <span className="text-[10px] font-bold text-[#0D47A1] bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">TZS</span>
                          <span className={`text-base font-bold tracking-tight ${
                            totalPcs > 0 && form.wholesale_price > 0 ? 'text-[#0D47A1]' : 'text-slate-300'
                          }`}>
                            {totalPcs > 0 && form.wholesale_price > 0
                              ? (form.wholesale_price * totalPcs).toLocaleString()
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Size & Stock Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/60">
                  <SectionTitle icon={Layers} title="Saizi & Stoki" />
                </div>
                <div className="px-5 py-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel required>Namba ya Kwanza</FieldLabel>
                      <Input
                        type="number"
                        placeholder="36"
                        value={rangeFrom}
                        onChange={e => setRangeFrom(e.target.value)}
                        className="h-10 border-slate-200 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 bg-white text-sm shadow-sm text-center font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required>Namba ya Mwisho</FieldLabel>
                      <Input
                        type="number"
                        placeholder="45"
                        value={rangeTo}
                        onChange={e => setRangeTo(e.target.value)}
                        className="h-10 border-slate-200 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 bg-white text-sm shadow-sm text-center font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel required>Jumla ya Pcs</FieldLabel>
                      <Input
                        type="number"
                        placeholder="30"
                        value={rangeQty}
                        onChange={e => setRangeQty(e.target.value)}
                        className="h-10 border-slate-200 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 bg-white text-sm shadow-sm text-center font-semibold"
                      />
                    </div>
                  </div>

                  {sizeCount > 0 ? (
                    <div className="rounded-xl border border-[#0D47A1]/15 bg-[#0D47A1]/4 overflow-hidden">
                      <div className="px-3 py-2 flex flex-wrap gap-1">
                        {sizeList.map(s => (
                          <div key={s} className="w-8 h-8 rounded-lg bg-white border border-[#0D47A1]/20 shadow-sm flex items-center justify-center">
                            <span className="text-xs font-bold text-[#0D47A1]">{s}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#0D47A1]/10 px-3 py-2 flex items-center justify-between bg-white/60">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>Saizi <strong className="text-slate-700">{sizeCount}</strong></span>
                          <span>·</span>
                          <span>
                            {remainder === 0
                              ? <><strong className="text-slate-700">{qtyFloor}</strong> kila saizi</>
                              : <><strong className="text-slate-700">{qtyFloor}–{qtyFloor + 1}</strong> kila saizi</>
                            }
                          </span>
                        </div>
                        <div className="bg-[#0D47A1] text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                          {totalPcs} pcs
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center">
                      <p className="text-xs text-slate-400">Weka namba ya kwanza, ya mwisho, na idadi — saizi vitaonekana hapa</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col w-[45%] overflow-hidden">
            <div className="flex-1 px-6 py-4 space-y-3">

              {/* Images Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <SectionTitle icon={ImageIcon} title="Picha za Bidhaa" />
                  {images.length > 0 && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      {images.filter(i => !i.uploading && !i.error).length}/{images.length}
                    </span>
                  )}
                </div>
                <div className="px-5 py-3 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && handleFiles(e.target.files)}
                  />

                  {images.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((img, i) => (
                        <div
                          key={i}
                          className={`relative aspect-square rounded-xl overflow-hidden bg-slate-100 transition-all group ${
                            img.error ? 'ring-2 ring-red-400' : img.uploading ? 'ring-2 ring-blue-300' : 'ring-0 shadow-md hover:shadow-xl hover:scale-[1.02]'
                          }`}
                        >
                          {(img.local || img.url) && !img.error && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.local ?? img.url} alt={img.name} className={`w-full h-full object-cover transition-all duration-300 ${img.uploading ? 'scale-105 blur-[1px] opacity-60' : 'opacity-100'}`} />
                          )}
                          {img.error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50">
                              <X className="w-4 h-4 text-red-500" />
                              <p className="text-[9px] text-red-500 font-bold">Imeshindwa</p>
                            </div>
                          )}
                          {img.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                              <CloudUpload className="w-5 h-5 text-[#0D47A1] animate-pulse" />
                            </div>
                          )}
                          {!img.uploading && !img.error && img.url && (
                            <div className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow">OK</div>
                          )}
                          {i === 0 && !img.uploading && !img.error && (
                            <div className="absolute top-1 left-1 bg-[#0D47A1] text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow">COVER</div>
                          )}
                          <button type="button" onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0D47A1]/50 hover:bg-[#0D47A1]/4 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group">
                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#0D47A1] transition-colors" />
                        <span className="text-[9px] text-slate-400 group-hover:text-[#0D47A1] font-semibold">Ongeza</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                        dragging ? 'border-[#0D47A1] bg-[#0D47A1]/5 scale-[1.01]' : 'border-slate-200 hover:border-[#0D47A1]/40 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${dragging ? 'bg-[#0D47A1]/15 scale-110' : 'bg-slate-100'}`}>
                          <CloudUpload className={`w-6 h-6 transition-colors ${dragging ? 'text-[#0D47A1]' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{dragging ? 'Acha picha hapa!' : 'Buruta picha hapa'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">au <span className="text-[#0D47A1] font-semibold underline underline-offset-2">bonyeza kuchagua</span></p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-semibold px-3 py-1 rounded-full">
                          <Upload className="w-3 h-3" /> Zinapunguzwa kiotomatiki
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadingCount > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-[#0D47A1] animate-spin flex-shrink-0" />
                      <p className="text-xs font-bold text-[#0D47A1]">Inapakia picha {uploadingCount}... subiri</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Settings Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/60">
                  <SectionTitle icon={Settings2} title="Mipangilio ya Bidhaa" />
                </div>
                <div className="px-5 py-3 space-y-2">
                  {([
                    { key: 'active',      label: 'Inauzwa Sasa',  desc: 'Bidhaa inaonekana kwa wateja',      dot: 'bg-emerald-500', activeBg: 'bg-emerald-50/60 border-emerald-100' },
                    { key: 'is_trending', label: 'Inabweka',      desc: 'Bidhaa inayouzika zaidi dukani',    dot: 'bg-orange-500', activeBg: 'bg-orange-50/60 border-orange-100' },
                    { key: 'is_new',      label: 'Arrival Mpya',  desc: 'Bidhaa mpya iliyofika dukani',      dot: 'bg-blue-500',   activeBg: 'bg-blue-50/60 border-blue-100' },
                  ] as const).map(({ key, label, desc, dot, activeBg }) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                        form[key] ? activeBg : 'bg-slate-50/40 border-slate-100 hover:border-slate-200'
                      }`}
                      onClick={() => set(key, !form[key] as boolean)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${form[key] ? dot : 'bg-slate-300'}`} />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{label}</p>
                          <p className="text-xs text-slate-400">{desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={form[key] as boolean}
                        onCheckedChange={v => set(key, v)}
                        className="cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-8 py-3 border-t border-slate-200/80 bg-white shadow-[0_-1px_0_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            {uploadingCount > 0 ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span className="text-amber-600 font-semibold">Inapakia picha {uploadingCount}, tafadhali subiri...</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{isEdit ? 'Mabadiliko yatahifadhiwa Supabase mara moja' : 'Bidhaa itaongezwa kwenye duka mara moja'}</span>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 px-6 text-sm cursor-pointer border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-medium"
            >
              Ghairi
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploadingCount > 0}
              className="h-9 px-8 text-sm font-semibold bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer shadow-md disabled:opacity-50 gap-2.5 rounded-xl transition-all hover:shadow-lg hover:-translate-y-px active:translate-y-0"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Inahifadhi...</>
                : isEdit ? 'Hifadhi Mabadiliko' : 'Ongeza Bidhaa'
              }
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}

