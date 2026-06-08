import { createClient } from '@supabase/supabase-js'
import {
  ShoppingBag, Clock, CheckCircle, XCircle, Package,
  Users, TrendingUp, CalendarDays, ArrowUpRight, Truck,
} from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import ShopLinkCard from '@/components/admin/ShopLinkCard'
import type { Order } from '@/lib/types'

async function getDashboardData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const [
    { data: orders },
    { count: totalProducts },
    { count: totalCustomers },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('orders').select('id, status, total, created_at'),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('msafiri_users').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id, user_name, total, status, created_at, user_phone')
      .order('created_at', { ascending: false }).limit(8),
  ])

  const all = orders ?? []
  const today = new Date().toDateString()

  return {
    stats: {
      total: all.length,
      pending: all.filter(o => o.status === 'pending').length,
      active: all.filter(o => ['confirmed', 'processing', 'in_transit'].includes(o.status)).length,
      delivered: all.filter(o => o.status === 'delivered').length,
      cancelled: all.filter(o => o.status === 'cancelled').length,
      products: totalProducts ?? 0,
      customers: totalCustomers ?? 0,
      totalRevenue: all.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total ?? 0), 0),
      todayOrders: all.filter(o => new Date(o.created_at).toDateString() === today).length,
      todayRevenue: all
        .filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === today)
        .reduce((s, o) => s + (o.total ?? 0), 0),
    },
    recentOrders: recentOrders ?? [],
  }
}

export default async function DashboardPage() {
  const { stats, recentOrders } = await getDashboardData()

  const now = new Date()
  const dateStr = now.toLocaleDateString('sw-TZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const orderRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0

  return (
    <div className="space-y-6 pb-8">

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0D47A1] via-[#1565C0] to-[#1976D2] rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute right-20 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-blue-200 text-sm font-medium">{dateStr}</p>
          <h1 className="text-2xl font-bold mt-1">Karibu tena, Administrator 👋</h1>
          <p className="text-blue-200 text-sm mt-1">Hapa ndio hali ya duka lako leo</p>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center">
              <p className="text-blue-100 text-xs">Orders Leo</p>
              <p className="text-xl font-bold">{stats.todayOrders}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center">
              <p className="text-blue-100 text-xs">Mapato Leo</p>
              <p className="text-xl font-bold">{formatCurrency(stats.todayRevenue)}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center">
              <p className="text-blue-100 text-xs">Delivery Rate</p>
              <p className="text-xl font-bold">{orderRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── REVENUE + SHOP LINK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Total Revenue — big card */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#FF8F00] to-[#F57C00] rounded-2xl p-6 text-white shadow-sm">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute right-10 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-orange-100 text-sm font-medium">Mapato Yote</span>
              </div>
              <p className="text-3xl font-extrabold tracking-tight mt-2">{formatCurrency(stats.totalRevenue)}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="bg-white/20 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-orange-100">Orders zote</p>
                  <p className="font-bold">{stats.total}</p>
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-orange-100">Zimewasilishwa</p>
                  <p className="font-bold">{stats.delivered}</p>
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-1.5">
                  <p className="text-xs text-orange-100">Zimefutwa</p>
                  <p className="font-bold">{stats.cancelled}</p>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Shop Link */}
        <ShopLinkCard />
      </div>

      {/* ── ORDER STATUS GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Inasubiri', value: stats.pending, icon: Clock, bg: 'bg-orange-50', iconBg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-100' },
          { label: 'Inashughulikiwa', value: stats.active, icon: Truck, bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-100' },
          { label: 'Imewasilishwa', value: stats.delivered, icon: CheckCircle, bg: 'bg-green-50', iconBg: 'bg-green-500', text: 'text-green-700', border: 'border-green-100' },
          { label: 'Imefutwa', value: stats.cancelled, icon: XCircle, bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-700', border: 'border-red-100' },
        ].map(({ label, value, icon: Icon, bg, iconBg, text, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-2xl p-4 flex flex-col gap-3`}>
            <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
              <Icon className="w-4.5 h-4.5 text-white w-5 h-5" />
            </div>
            <div>
              <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── PRODUCTS & CUSTOMERS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Package className="w-7 h-7 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">Bidhaa Dukani</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.products}</p>
          </div>
          <a href="/admin/products" className="flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline">
            Angalia <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Users className="w-7 h-7 text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">Wateja Waliosajiliwa</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.customers}</p>
          </div>
          <a href="/admin/customers" className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline">
            Angalia <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* ── RECENT ORDERS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Orders za Karibuni</h2>
            <p className="text-gray-400 text-xs mt-0.5">Orders 8 za mwisho</p>
          </div>
          <a href="/admin/orders" className="flex items-center gap-1 text-sm text-[#0D47A1] font-semibold hover:underline">
            Zote <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="divide-y divide-gray-50">
          {(recentOrders as (Order & { user_phone?: string })[]).map((order) => (
            <div key={order.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#0D47A1]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#0D47A1] font-bold text-xs">{(order.user_name ?? '??').slice(0, 2).toUpperCase()}</span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{order.user_name ?? '—'}</p>
                <p className="text-xs text-gray-400 font-mono"># {order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}</p>
              </div>
              {/* Total */}
              <p className="font-bold text-gray-800 text-sm flex-shrink-0">{formatCurrency(order.total ?? 0)}</p>
              {/* Status */}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <div className="px-6 py-16 text-center">
              <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Hakuna orders kwa sasa</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
