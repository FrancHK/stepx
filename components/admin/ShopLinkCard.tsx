'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, Link2 } from 'lucide-react'

export default function ShopLinkCard() {
  const [copied, setCopied] = useState(false)
  const [shopUrl, setShopUrl] = useState('/shop')

  useEffect(() => {
    setShopUrl(`${window.location.origin}/shop`)
  }, [])

  function copyLink() {
    const url = `${window.location.origin}/shop`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#FF8F00] to-[#F57C00] rounded-2xl p-5 text-white shadow-sm">
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-base">Link ya Wateja</p>
            <p className="text-orange-100 text-xs">Shiriki na wateja wako</p>
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2.5 flex items-center gap-2">
          <p className="flex-1 text-sm font-mono truncate text-orange-50">{shopUrl}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-[#F57C00] font-semibold text-sm py-2.5 rounded-xl hover:bg-orange-50 cursor-pointer transition-all"
          >
            {copied
              ? <><Check className="w-4 h-4 text-green-500" /> Imenakiliwa!</>
              : <><Copy className="w-4 h-4" /> Nakili Link</>
            }
          </button>
          <a
            href="/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-xl cursor-pointer transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
