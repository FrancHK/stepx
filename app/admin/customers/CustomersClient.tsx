'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Search, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { MsafiriUser } from '@/lib/types'

interface Props { initialCustomers: MsafiriUser[] }

export default function CustomersClient({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState<MsafiriUser[]>(initialCustomers)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  }, [customers, search])

  async function toggleType(customer: MsafiriUser) {
    const newType = customer.customer_type === 'retail' ? 'wholesale' : 'retail'
    const supabase = createClient()
    const { error } = await supabase
      .from('msafiri_users')
      .update({ customer_type: newType })
      .eq('id', customer.id)
    if (error) { toast.error('Kuna tatizo.'); return }
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, customer_type: newType } : c))
    toast.success(`Imebadilishwa hadi ${newType === 'wholesale' ? 'Jumla' : 'Rejareja'}`)
  }

  async function toggleDisabled(customer: MsafiriUser) {
    const supabase = createClient()
    const { error } = await supabase
      .from('msafiri_users')
      .update({ disabled: !customer.disabled })
      .eq('id', customer.id)
    if (error) { toast.error('Kuna tatizo.'); return }
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, disabled: !c.disabled } : c))
    toast.success(`Akaunti ${!customer.disabled ? 'imezuiwa' : 'imewashwa'}`)
  }

  const stats = {
    total: customers.length,
    wholesale: customers.filter(c => c.customer_type === 'wholesale').length,
    disabled: customers.filter(c => c.disabled).length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <p className="text-gray-500 text-sm mt-1">{customers.length} total customers</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-[#0D47A1]' },
          { label: 'Wholesale', value: stats.wholesale, color: 'bg-amber-500' },
          { label: 'Disabled', value: stats.disabled, color: 'bg-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center`}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                {['Name', 'Email', 'Phone', 'Type', 'Status', 'Joined', 'Toggle Type', 'Toggle Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-4 text-sm font-semibold text-gray-800 max-w-[140px] truncate">
                    {customer.name ?? '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 max-w-[160px] truncate">
                    {customer.email ?? '—'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {customer.phone ?? '—'}
                  </td>
                  <td className="px-4 py-4">
                    {customer.customer_type === 'wholesale' ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 border text-xs">
                        Jumla
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Rejareja</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {customer.disabled ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 border text-xs">
                        Imezuiwa
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 border text-xs">
                        Active
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(customer.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={customer.customer_type === 'wholesale'}
                        onCheckedChange={() => toggleType(customer)}
                        className="cursor-pointer"
                      />
                      <span className="text-xs text-gray-500 hidden sm:block">
                        {customer.customer_type === 'wholesale' ? 'Jumla' : 'Rejareja'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!customer.disabled}
                        onCheckedChange={() => toggleDisabled(customer)}
                        className="cursor-pointer data-[state=checked]:bg-green-500"
                      />
                      <span className="text-xs text-gray-500 hidden sm:block">
                        {customer.disabled ? 'Zuiwa' : 'Washa'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Hakuna customers zinazolingana.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
