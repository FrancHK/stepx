'use client'

import { Menu, ShoppingBag } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavbarProps {
  onMenuClick: () => void
  adminEmail: string
}

export default function Navbar({ onMenuClick, adminEmail }: NavbarProps) {
  const initials = adminEmail?.slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 lg:hidden">
          <ShoppingBag className="w-5 h-5 text-[#0D47A1]" />
          <span className="font-bold text-[#0D47A1] text-base">StepX</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-gray-800">Administrator</p>
          <p className="text-xs text-gray-500">{adminEmail}</p>
        </div>
        <Avatar className="w-9 h-9 bg-[#0D47A1]">
          <AvatarFallback className="bg-[#0D47A1] text-white text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
