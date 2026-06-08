'use client'

import { useState, useTransition } from 'react'
import { Search, Plus, Pencil, Trash2, Phone, MapPin, FileText, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { addMteja, updateMteja, deleteMteja } from './actions'
import type { Mteja } from '@/lib/types'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY = { name: '', phone: '', location: '', notes: '' }

export default function WatejaClient({ initialWateja }: { initialWateja: Mteja[] }) {
  const [wateja, setWateja] = useState<Mteja[]>(initialWateja)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Mteja | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteTarget, setDeleteTarget] = useState<Mteja | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = wateja.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.phone.includes(search) ||
    w.location.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(w: Mteja) {
    setEditing(w)
    setForm({ name: w.name, phone: w.phone, location: w.location, notes: w.notes ?? '' })
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Jina ni lazima'); return }
    if (!form.phone.trim()) { toast.error('Namba ya simu ni lazima'); return }
    startTransition(async () => {
      try {
        if (editing) {
          await updateMteja(editing.id, form)
          setWateja(prev => prev.map(w => w.id === editing.id ? { ...w, ...form } : w))
          toast.success('Mteja amesasishwa')
        } else {
          await addMteja(form)
          // refresh from server via revalidatePath — local optimistic add
          const newEntry: Mteja = {
            id: crypto.randomUUID(),
            ...form,
            created_at: new Date().toISOString(),
          }
          setWateja(prev => [newEntry, ...prev])
          toast.success('Mteja ameongezwa')
        }
        setModalOpen(false)
      } catch (e: unknown) {
        toast.error((e as Error).message)
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      try {
        await deleteMteja(deleteTarget.id)
        setWateja(prev => prev.filter(w => w.id !== deleteTarget.id))
        toast.success('Mteja amefutwa')
        setDeleteTarget(null)
      } catch (e: unknown) {
        toast.error((e as Error).message)
      }
    })
  }

  const initials = (name: string) => name.trim().split(' ').map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('')

  const avatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-teal-500 to-teal-600',
      'from-orange-500 to-orange-600',
      'from-rose-500 to-rose-600',
      'from-indigo-500 to-indigo-600',
    ]
    const i = name.charCodeAt(0) % colors.length
    return colors[i]
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Wateja</h1>
          <p className="text-gray-400 text-sm mt-0.5">{wateja.length} wateja wamesajiliwa</p>
        </div>
        <Button onClick={openAdd} className="bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer gap-2">
          <Plus className="w-4 h-4" /> Ongeza Mteja
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Tafuta jina, simu, au location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white border-gray-200 h-10"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            {search ? 'Hakuna wateja wanaolingana' : 'Bado hujaweka wateja wowote'}
          </p>
          {!search && (
            <button onClick={openAdd} className="mt-3 text-sm text-[#0D47A1] font-semibold hover:underline cursor-pointer">
              + Ongeza mteja wa kwanza
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(w => (
            <div
              key={w.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0D47A1]/20 transition-all duration-200 overflow-hidden"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(w.name)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <span className="text-white font-bold text-sm">{initials(w.name)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{w.name}</p>
                  <div className="flex items-center flex-wrap gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="w-3 h-3" />{w.phone}
                    </span>
                    {w.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />{w.location}
                      </span>
                    )}
                    {w.notes && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 italic max-w-[200px] truncate">
                        <FileText className="w-3 h-3 flex-shrink-0" />{w.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:block text-xs text-gray-300">{formatDate(w.created_at)}</span>
                  <button
                    onClick={() => openEdit(w)}
                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-[#0D47A1] cursor-pointer transition-colors"
                    title="Hariri"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(w)}
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 cursor-pointer transition-colors"
                    title="Futa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0D47A1] to-[#1976D2] px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-bold">
                {editing ? 'Hariri Mteja' : 'Ongeza Mteja Mpya'}
              </DialogTitle>
              <p className="text-blue-200 text-xs mt-0.5">
                {editing ? `Unabadilisha: ${editing.name}` : 'Jaza maelezo ya mteja'}
              </p>
            </DialogHeader>
          </div>

          <div className="p-5 space-y-3">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Jina Kamili *</label>
              <Input
                placeholder="Mfano: Juma Ally"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border-gray-200 h-10"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3 h-3" /> Namba ya Simu *
              </label>
              <Input
                placeholder="0712 345 678"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="border-gray-200 h-10"
                type="tel"
              />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </label>
              <Input
                placeholder="Mfano: Kariakoo, Dar es Salaam"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="border-gray-200 h-10"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <FileText className="w-3 h-3" /> Maelezo (Hiari)
              </label>
              <textarea
                placeholder="Maelezo ya ziada kuhusu mteja huyu..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1]"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 cursor-pointer border-gray-200"
                disabled={isPending}
              >
                Ghairi
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 bg-[#0D47A1] hover:bg-[#0a3880] cursor-pointer"
              >
                {isPending ? 'Inahifadhi...' : editing ? 'Hifadhi' : 'Ongeza'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Futa Mteja</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mt-2">
            Una uhakika unataka kufuta <span className="font-bold">{deleteTarget?.name}</span>? Hatua hii haiwezi kurudishwa.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1 cursor-pointer" disabled={isPending}>
              Ghairi
            </Button>
            <Button onClick={handleDelete} disabled={isPending} className="flex-1 bg-red-500 hover:bg-red-600 cursor-pointer">
              {isPending ? 'Inafuta...' : 'Futa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
