'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addLocation, updateLocation, toggleLocation, deleteLocation } from './actions'
import { Plus, MapPin, Pencil, Trash2, ToggleLeft, ToggleRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { Location } from '@/lib/types'

interface Props { initialLocations: Location[] }

const EMPTY = { name: '', address: '', description: '' }

export default function LocationsClient({ initialLocations }: Props) {
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)

  const filtered = locations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.address.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  function openEdit(loc: Location) {
    setEditing(loc)
    setForm({ name: loc.name, address: loc.address, description: loc.description })
    setModalOpen(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Weka jina la location'); return }
    if (!form.address.trim()) { toast.error('Weka anwani ya location'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateLocation(editing.id, form.name, form.address, form.description)
        setLocations(prev => prev.map(l => l.id === editing.id
          ? { ...l, name: form.name.trim(), address: form.address.trim(), description: form.description.trim() }
          : l
        ))
        toast.success('Location imesasishwa!')
      } else {
        const loc = await addLocation(form.name, form.address, form.description)
        setLocations(prev => [loc, ...prev])
        toast.success('Location imeongezwa!')
      }
      setModalOpen(false)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Kuna tatizo.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(loc: Location) {
    try {
      await toggleLocation(loc.id, !loc.active)
      setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, active: !loc.active } : l))
    } catch { toast.error('Kuna tatizo.') }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteLocation(deleteTarget.id)
      setLocations(prev => prev.filter(l => l.id !== deleteTarget.id))
      toast.success('Location imefutwa.')
      setDeleteTarget(null)
    } catch { toast.error('Kuna tatizo.') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Locations</h1>
          <p className="text-gray-500 text-sm mt-1">{locations.length} location{locations.length !== 1 ? 's' : ''} zimeandikishwa</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0D47A1] hover:bg-[#0a3880] gap-2 cursor-pointer">
          <Plus className="w-4 h-4" /> Ongeza Location
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Tafuta location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Hakuna locations</p>
          <p className="text-gray-400 text-sm mt-1">Bonyeza "Ongeza Location" kuanza</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(loc => (
            <div
              key={loc.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all duration-200 hover:shadow-md ${
                loc.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    loc.active ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <MapPin className={`w-5 h-5 ${loc.active ? 'text-[#0D47A1]' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{loc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{loc.address}</p>
                    {loc.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{loc.description}</p>
                    )}
                    <p className="text-[10px] text-gray-300 mt-1.5">{formatDate(loc.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(loc)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    title={loc.active ? 'Zima' : 'Washa'}
                  >
                    {loc.active
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5 text-gray-400" />
                    }
                  </button>
                  <button
                    onClick={() => openEdit(loc)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-[#0D47A1]" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(loc)}
                    className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
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
              {editing ? 'Hariri Location' : 'Ongeza Location Mpya'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Jina (mfano: Dar es Salaam) *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="pl-10"
                autoFocus
              />
            </div>
            <Input
              placeholder="Anwani (mfano: Kariakoo, Ilala) *"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
            <textarea
              placeholder="Maelezo (si lazima)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] placeholder:text-muted-foreground"
            />
            <div className="flex gap-2 pt-1">
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
            <DialogTitle className="text-red-600">Futa Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-gray-600 text-sm">
              Una uhakika unataka kufuta <span className="font-bold text-gray-800">"{deleteTarget?.name}"</span>? Hatua hii haiwezi kurudishwa.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setDeleteTarget(null)}>
                Ghairi
              </Button>
              <Button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 cursor-pointer">
                Futa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
