'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Phone } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function phoneToEmail(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    const local = digits.startsWith('0') ? digits.slice(1) : digits
    return `255${local}@stepx.app`
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.startsWith('07') || phone.replace(/\D/g, '').length !== 10) {
      toast.error('Weka namba sahihi inayoanza na 07 (mfano: 0758285354)')
      return
    }
    setLoading(true)
    try {
      const email = phoneToEmail(phone)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profile } = await supabase
        .from('msafiri_users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Hauna ruhusa ya kuingia admin panel.')
      }

      toast.success('Umeingia kwa mafanikio!')
      window.location.href = '/admin/dashboard'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kuna tatizo. Jaribu tena.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#0a3880] p-4">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF8F00]/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image src="/logo.png" alt="StepX" width={120} height={80} className="object-contain mb-2 w-auto h-auto" style={{ maxWidth: 120 }} priority />
            <p className="text-gray-500 text-sm">Admin Panel — Ingia akaunti yako</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 font-medium">Namba ya Simu</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Weka namba yako hapa"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="h-11 pl-10 border-gray-200 focus:border-[#0D47A1] focus:ring-[#0D47A1]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Nywila</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-11 border-gray-200 focus:border-[#0D47A1] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0D47A1] hover:bg-[#0a3880] text-white font-semibold cursor-pointer transition-colors duration-200"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inaingia...</>
              ) : 'Ingia'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            StepX Admin &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
