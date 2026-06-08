'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ShoppingBag, Package, Users, LogOut, X,
  ShoppingBag as StoreIcon, ChevronDown, Tag, Truck, MoreHorizontal, MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  pendingCount: number
  onClose?: () => void
}

const mainNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders',    label: 'Orders',    icon: ShoppingBag },
  { href: '/admin/products',  label: 'Products',  icon: Package },
  { href: '/admin/customers', label: 'Customers', icon: Users },
]

const moreNav = [
  { href: '/admin/brands',       label: 'Brands',       icon: Tag },
  { href: '/admin/transporters', label: 'Transporters',  icon: Truck },
  { href: '/admin/locations',    label: 'Locations',     icon: MapPin },
]

export default function Sidebar({ pendingCount, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const moreActive = moreNav.some(i => pathname.startsWith(i.href))
  const [moreOpen, setMoreOpen] = useState(moreActive)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Umetoka kwa mafanikio.')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col h-full bg-[#0D47A1] text-white w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <StoreIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">StepX</p>
            <p className="text-white/60 text-xs">Admin Panel</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Main nav */}
        {mainNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                active
                  ? 'bg-white text-[#0D47A1] shadow-md'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
              {href === '/admin/orders' && pendingCount > 0 && (
                <Badge className="ml-auto bg-[#FF8F00] hover:bg-[#FF8F00] text-white text-xs px-1.5 min-w-[20px] h-5 flex items-center justify-center">
                  {pendingCount}
                </Badge>
              )}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="pt-2 pb-1 px-4">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Zaidi</p>
        </div>

        {/* More toggle */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
            moreActive
              ? 'bg-white/15 text-white'
              : 'text-white/80 hover:bg-white/15 hover:text-white'
          )}
        >
          <MoreHorizontal className="w-5 h-5 flex-shrink-0" />
          <span>More</span>
          <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform duration-200', moreOpen && 'rotate-180')} />
        </button>

        {/* More sub-items */}
        {moreOpen && (
          <div className="pl-3 space-y-1">
            {moreNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                    active
                      ? 'bg-white text-[#0D47A1] shadow-md'
                      : 'text-white/70 hover:bg-white/15 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/15">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
