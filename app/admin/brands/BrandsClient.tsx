'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addBrand, updateBrand, toggleBrand, deleteBrand } from './actions'
import { Plus, Tag, Pencil, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { Brand } from '@/lib/types'

interface Props { initialBrands: Brand[] }

export default function BrandsClient({ initialBrands }: Props) {
  const [brands, setBrands] = useState<Brand[]>(initialBrands)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditing(null)
    setName('')
    setModalOpen(true)
  }

  function openEdit(brand: Brand) {
    setEditing(brand)
    setName(brand.name)
    setModalOpen(true)
  }

  async function save() {
    if (!name.trim()) { toast.error('Weka jina la brand'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateBrand(editing.id, name.trim())
        setBrands(prev => prev.map(b => b.id === editing.id ? { ...b, name: name.trim() } : b))
        toast.success('Brand imesasishwa!')
      } else {
        const brand = await addBrand(name.trim())
        setBrands(prev => [...prev, brand].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Brand imeongezwa!')
      }
      setModalOpen(false)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Kuna tatizo.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(brand: Brand) {
    try {
      await toggleBrand(brand.id, !brand.active)
      setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, active: !brand.active } : b))
    } catch { toast.error('Kuna tatizo.') }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteBrand(deleteTarget.id)
      setBrands(prev => prev.filter(b => b.id !== deleteTarget.id))
      toast.success('Brand imefutwa.')
      setDeleteTarget(null)
    } catch { toast.error('Kuna tatizo.') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Brands</h1>
          <p className="text-gray-500 text-sm mt-1">{brands.length} brand{brands.length !== 1 ? 's' : ''} zimeandikishwa</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0D47A1] hover:bg-[#0a3880] gap-2 cursor-pointer">
          <Plus className="w-4 h-4" /> Ongeza Brand
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Tafuta brand..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Hakuna brands</p>
          <p className="text-gray-400 text-sm mt-1">Bonyeza "Ongeza Brand" kuanza</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(brand => (
            <div
              key={brand.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center justify-between gap-3 transition-all duration-200 hover:shadow-md ${
                brand.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  brand.active ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Tag className={`w-5 h-5 ${brand.active ? 'text-[#0D47A1]' : 'text-gray-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{brand.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(brand.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActive(brand)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  title={brand.active ? 'Zima' : 'Washa'}
                >
                  {brand.active
                    ? <ToggleRight className="w-5 h-5 text-green-500" />
                    : <ToggleLeft className="w-5 h-5 text-gray-400" />
                  }
                </button>
                <button
                  onClick={() => openEdit(brand)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <Pencil className="w-4 h-4 text-[#0D47A1]" />
                </button>
                <button
                  onClick={() => setDeleteTarget(brand)}
                  className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={open => !open && setModalOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0D47A1]">
              {editing ? 'Hariri Brand' : 'Ongeza Brand Mpya'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Jina la brand"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                className="pl-10"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setModalOpen(false)}>
                Ghairi
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer"
              >
                {saving ? 'Inahifadhi...' : editing ? 'Hifadhi' : 'Ongeza'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Futa Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-gray-600 text-sm">
              Una uhakika unataka kufuta brand <span className="font-bold text-gray-800">"{deleteTarget?.name}"</span>? Hatua hii haiwezi kurudishwa.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setDeleteTarget(null)}>
                Ghairi
              </Button>
              <Button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 cursor-pointer"
              >
                Futa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
