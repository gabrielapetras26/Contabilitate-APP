'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [parola, setParola] = useState('')
  const [eroare, setEroare] = useState('')
  const [loading, setLoading] = useState(false)
  const [roluri, setRoluri] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [selecteazaRol, setSelecteazaRol] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setEroare('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: parola
    })

    if (error) {
      setEroare('Email sau parolă greșită.')
      setLoading(false)
      return
    }

    const { data: roluriData } = await supabase
      .from('utilizator_roluri')
      .select('*')
      .eq('utilizator_id', data.user.id)
      .eq('activ', true)

    if (!roluriData || roluriData.length === 0) {
      setEroare('Contul nu are roluri asociate. Contactează administratorul.')
      setLoading(false)
      return
    }

    if (roluriData.length === 1) {
      redirectDupaRol(roluriData[0].rol)
    } else {
      setUserId(data.user.id)
      setRoluri(roluriData)
      setSelecteazaRol(true)
    }

    setLoading(false)
  }

  function redirectDupaRol(rol: string) {
    if (rol === 'admin_platforma') router.push('/dashboard/super-admin')
    else if (rol === 'admin_conta') router.push('/dashboard/admin-conta')
    else if (rol === 'contabil') router.push('/dashboard/contabil')
    else router.push('/dashboard/firma')
  }

  function numeRol(rol: string) {
    if (rol === 'admin_platforma') return '👑 Administrator Platformă'
    if (rol === 'admin_conta') return '🏦 Administrator Firmă Contabilitate'
    if (rol === 'contabil') return '👤 Contabil'
    if (rol === 'admin_firma_client') return '🏢 Administrator Firmă Client'
    if (rol === 'angajat_firma_client') return '👥 Angajat Firmă Client'
    return rol
  }

  if (selecteazaRol) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Cu ce rol intri?</h1>
            <p className="text-gray-500 mt-1">Alege perspectiva cu care vrei să lucrezi acum</p>
          </div>
          <div className="space-y-3">
            {roluri.map(r => (
              <button key={r.id}
                onClick={() => redirectDupaRol(r.rol)}
                className="w-full py-4 px-6 bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-400 rounded-xl text-left transition">
                <p className="font-semibold text-gray-800">{numeRol(r.rol)}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Intră în cont</h1>
          <p className="text-gray-500 mt-1">Bine ai revenit!</p>
        </div>

        {eroare && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {eroare}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="email@exemplu.ro"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Parolă</label>
            <input
              type="password"
              value={parola}
              onChange={e => setParola(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Parola ta"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Se verifică...' : 'Intră în cont'}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Nu ai cont?{' '}
          <Link href="/auth/register" className="text-indigo-600 hover:underline font-semibold">
            Înregistrează-te
          </Link>
        </p>

      </div>
    </main>
  )
}