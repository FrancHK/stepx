'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, ImageOff, Star, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency, CATEGORY_LABELS, AGE_GROUP_LABELS } from '@/lib/utils'
import type { Product, Category, AgeGroup } from '@/lib/types'
import ProductFormModal from './ProductFormModal'

interface Props { initialProducts: Product[] }

export default function ProductsClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
      const matchCat = catFilter === 'all' || p.category === catFilter
      const matchAge = ageFilter === 'all' || p.age_group === ageFilter
      return matchSearch && matchCat && matchAge
    })
  }, [products, search, catFilter, ageFilter])

  function openAdd() { setEditingProduct(null); setShowForm(true) }
  function openEdit(p: Product) { setEditingProduct(p); setShowForm(true) }

  async function toggleActive(product: Product) {
    const supabase = createClient()
    const { error } = await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    if (error) { toast.error('Kuna tatizo.'); return }
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: !p.active } : p))
    toast.success(`Product ${!product.active ? 'imewashwa' : 'imezimwa'}`)
  }

  async function deleteProduct() {
    if (!deleteId) return
    const supabase = createClient()
    const { error } = await supabase.from('products').delete().eq('id', deleteId)
    if (error) { toast.error('Kuna tatizo.'); return }
    setProducts(prev => prev.filter(p => p.id !== deleteId))
    setDeleteId(null)
    toast.success('Product imefutwa.')
  }

  function onSaved(product: Product, isNew: boolean) {
    if (isNew) {
      setProducts(prev => [product, ...prev])
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p))
    }
    setShowForm(false)
  }

  function stockInfo(stock: Record<string, number>) {
    if (!stock || Object.keys(stock).length === 0) return { total: 0, range: '—' }
    const keys = Object.keys(stock).map(Number).filter(Boolean).sort((a, b) => a - b)
    const total = Object.values(stock).reduce((s, v) => s + (v ?? 0), 0)
    const range = keys.length > 1 ? `${keys[0]} – ${keys[keys.length - 1]}` : keys.length === 1 ? String(keys[0]) : '—'
    return { total, range }
  }

  const thumbnail = (images: string[]) => images?.[0] ?? null

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} total products</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0D47A1] hover:bg-[#0a3880] gap-2 cursor-pointer">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>
        <Select value={catFilter} onValueChange={v => setCatFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40 bg-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ageFilter} onValueChange={v => setAgeFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40 bg-white">
            <SelectValue placeholder="Age Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {Object.entries(AGE_GROUP_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(product => {
          const img = thumbnail(product.images)
          const { total: totalPcs, range: sizeRange } = stockInfo(product.stock)
          const totalValue = product.wholesale_price * totalPcs
          return (
            <div key={product.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

              {/* Image */}
              <div className="relative h-44 bg-slate-100 flex items-center justify-center flex-shrink-0">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-10 h-10 text-slate-300" />
                )}
                {/* Badges top-left */}
                <div className="absolute top-2.5 left-2.5 flex gap-1">
                  {product.is_trending && (
                    <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 font-semibold shadow-sm">
                      <Star className="w-2.5 h-2.5" /> Trending
                    </span>
                  )}
                  {product.is_new && (
                    <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 font-semibold shadow-sm">
                      <Sparkles className="w-2.5 h-2.5" /> Mpya
                    </span>
                  )}
                </div>
                {/* Active badge top-right */}
                <div className="absolute top-2.5 right-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-sm ${
                    product.active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {product.active ? 'Inauzwa' : 'Imezimwa'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col flex-1 p-4 space-y-3">
                {/* Name & brand */}
                <div>
                  <p className="font-bold text-slate-800 truncate">{product.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{product.brand}</p>
                </div>

                {/* Category & Age badges */}
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">{CATEGORY_LABELS[product.category]}</Badge>
                  <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">{AGE_GROUP_LABELS[product.age_group]}</Badge>
                </div>

                {/* Saizi & Stoki */}
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Saizi</p>
                    <p className="text-sm font-bold text-slate-700">{sizeRange}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Jumla Stoki</p>
                    <p className="text-sm font-bold text-slate-700">{totalPcs} pcs</p>
                  </div>
                </div>

                {/* Bei */}
                <div className="rounded-lg border border-[#0D47A1]/15 bg-[#0D47A1]/4 px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#0D47A1]/70 font-semibold uppercase tracking-wide">Bei / Pc</p>
                    <p className="text-sm font-bold text-[#0D47A1]">{formatCurrency(product.wholesale_price)}</p>
                  </div>
                  <div className="w-px h-8 bg-[#0D47A1]/10" />
                  <div className="text-right">
                    <p className="text-[10px] text-[#0D47A1]/70 font-semibold uppercase tracking-wide">Bei Mfuko</p>
                    <p className="text-sm font-bold text-[#0D47A1]">
                      {totalValue > 0 ? formatCurrency(totalValue) : '—'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-auto">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={product.active}
                      onCheckedChange={() => toggleActive(product)}
                      className="cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">{product.active ? 'Washa' : 'Zima'}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(product)}
                      className="p-1.5 text-[#0D47A1] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(product.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <ImageOff className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium">Hakuna bidhaa zinazolingana na utafutaji</p>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        open={showForm}
        product={editingProduct}
        onClose={() => setShowForm(false)}
        onSaved={onSaved}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Futa Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Hatua hii haiwezi kurudishwa. Product itafutwa kabisa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProduct} className="bg-red-500 hover:bg-red-600 cursor-pointer">
              Futa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
