import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ShoppingBag, Clock, Loader2, CheckCircle, XCircle, Package, Users, TrendingUp, CalendarDays } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/lib/types'

async function getDashboardData() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
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
    supabase.from('orders').select('id, user_name, total, status, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const allOrders = orders ?? []
  const today = new Date().toDateString()

  const stats = {
    total: allOrders.length,
    pending: allOrders.filter(o => o.status === 'pending').length,
    active: allOrders.filter(o => ['confirmed', 'processing', 'in_transit'].includes(o.status)).length,
    delivered: allOrders.filter(o => o.status === 'delivered').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
    products: totalProducts ?? 0,
    customers: totalCustomers ?? 0,
    totalRevenue: allOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (o.total ?? 0), 0),
    todayRevenue: allOrders
      .filter(o => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === today)
      .reduce((sum, o) => sum + (o.total ?? 0), 0),
  }

  return { stats, recentOrders: recentOrders ?? [] }
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType, label: string, value: string | number, color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const { stats, recentOrders } = await getDashboardData()

  const statCards = [
    { icon: ShoppingBag, label: 'Total Orders', value: stats.total, color: 'bg-[#0D47A1]' },
    { icon: Clock, label: 'Pending Orders', value: stats.pending, color: 'bg-orange-500' },
    { icon: Loader2, label: 'In Progress', value: stats.active, color: 'bg-blue-500' },
    { icon: CheckCircle, label: 'Delivered', value: stats.delivered, color: 'bg-green-500' },
    { icon: XCircle, label: 'Cancelled', value: stats.cancelled, color: 'bg-red-500' },
    { icon: Package, label: 'Total Products', value: stats.products, color: 'bg-purple-500' },
    { icon: Users, label: 'Total Customers', value: stats.customers, color: 'bg-teal-500' },
    { icon: TrendingUp, label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), color: 'bg-[#0D47A1]' },
    { icon: CalendarDays, label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), color: 'bg-[#FF8F00]' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, Administrator</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-lg">Recent Orders</h2>
          <p className="text-gray-500 text-sm">Last 10 orders</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(recentOrders as Order[]).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{order.user_name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">{formatCurrency(order.total ?? 0)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Hakuna orders kwa sasa.
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
