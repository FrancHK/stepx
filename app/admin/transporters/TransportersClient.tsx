'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addTransporter, updateTransporter, toggleTransporter, deleteTransporter } from './actions'
import { Plus, Truck, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Phone, MapPin, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { Transporter } from '@/lib/types'

interface Props { initialTransporters: Transporter[] }

const EMPTY: Omit<Transporter, 'id' | 'created_at' | 'active'> = {
  name: '', phone: '', location: '', description: '',
}

export default function TransportersClient({ initialTransporters }: Props) {
  const [transporters, setTransporters] = useState<Transporter[]>(initialTransporters)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transporter | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transporter | null>(null)

  const filtered = transporters.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.location?.toLowerCase().includes(search.toLowerCase())
  )

  function set(key: keyof typeof EMPTY, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY })
    setModalOpen(true)
  }

  function openEdit(t: Transporter) {
    setEditing(t)
    setForm({ name: t.name, phone: t.phone ?? '', location: t.location ?? '', description: t.description ?? '' })
    setModalOpen(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Weka jina la kampuni'); return }
    if (!form.phone.trim()) { toast.error('Weka namba ya simu'); return }
    setSaving(true)
    const input = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
    }
    try {
      if (editing) {
        await updateTransporter(editing.id, input)
        setTransporters(prev => prev.map(t => t.id === editing.id ? { ...t, ...input } : t))
        toast.success('Kampuni imesasishwa!')
      } else {
        const t = await addTransporter(input)
        setTransporters(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Kampuni imeongezwa!')
      }
      setModalOpen(false)
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Kuna tatizo.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(t: Transporter) {
    try {
      await toggleTransporter(t.id, !t.active)
      setTransporters(prev => prev.map(x => x.id === t.id ? { ...x, active: !t.active } : x))
    } catch { toast.error('Kuna tatizo.') }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteTransporter(deleteTarget.id)
      setTransporters(prev => prev.filter(t => t.id !== deleteTarget.id))
      toast.success('Kampuni imefutwa.')
      setDeleteTarget(null)
    } catch { toast.error('Kuna tatizo.') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transporters</h1>
          <p className="text-gray-500 text-sm mt-1">{transporters.length} kampuni za usafirishaji</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0D47A1] hover:bg-[#0a3880] gap-2 cursor-pointer">
          <Plus className="w-4 h-4" /> Ongeza Kampuni
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Tafuta kampuni au location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Hakuna kampuni za usafirishaji</p>
          <p className="text-gray-400 text-sm mt-1">Bonyeza "Ongeza Kampuni" kuanza</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(t => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all duration-200 hover:shadow-md ${
                t.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.active ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Truck className={`w-5 h-5 ${t.active ? 'text-[#0D47A1]' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(t)} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer" title={t.active ? 'Zima' : 'Washa'}>
                    {t.active
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5 text-gray-400" />
                    }
                  </button>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer">
                    <Pencil className="w-4 h-4 text-[#0D47A1]" />
                  </button>
                  <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 space-y-2">
                {t.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{t.phone}</span>
                  </div>
                )}
                {t.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{t.location}</span>
                  </div>
                )}
                {t.description && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{t.description}</span>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className="mt-3 pt-3 border-t border-gray-50">
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                  t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {t.active ? 'Inafanya kazi' : 'Imezimwa'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={open => !open && setModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0D47A1]">
              {editing ? 'Hariri Kampuni' : 'Ongeza Kampuni Mpya'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Name */}
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Jina la kampuni *"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Namba ya simu *"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Location */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Location / Eneo"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Description */}
            <textarea
              placeholder="Maelezo (optional)..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D47A1] focus:border-transparent"
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
            <DialogTitle className="text-red-600">Futa Kampuni</DialogTitle>
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
