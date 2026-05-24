'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Profil() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [roluri, setRoluri] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesaj, setMesaj] = useState('')
  const [eroare, setEroare] = useState('')

  // Date personale
  const [nume, setNume] = useState('')
  const [email, setEmail] = useState('')
  const [editDate, setEditDate] = useState(false)
  const [loadingDate, setLoadingDate] = useState(false)

  // Schimbare parola
  const [parolaNoua, setParolaNoua] = useState('')
  const [confirmaParola, setConfirmaParola] = useState('')
  const [loadingParola, setLoadingParola] = useState(false)

  useEffect(() => {
    incarcaDate()
  }, [])

  async function incarcaDate() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profilData } = await supabase
      .from('profiluri').select('*').eq('id', user.id).single()
    setProfil(profilData)
    setNume(profilData?.nume || '')
    setEmail(profilData?.email || '')

    const { data: roluriData } = await supabase
      .from('utilizator_roluri').select('*').eq('utilizator_id', user.id).eq('activ', true)
    setRoluri(roluriData || [])

    setLoading(false)
  }

  async function salveazaDate() {
    setLoadingDate(true)
    setEroare('')
    setMesaj('')

    if (!nume) {
      setEroare('Numele este obligatoriu.')
      setLoadingDate(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiluri').update({ nume, email }).eq('id', user?.id)

    setMesaj('Date actualizate cu succes!')
    setEditDate(false)
    await incarcaDate()
    setLoadingDate(false)
  }

  async function schimbaParola() {
    setLoadingParola(true)
    setEroare('')
    setMesaj('')

    if (!parolaNoua || !confirmaParola) {
      setEroare('Completează ambele câmpuri.')
      setLoadingParola(false)
      return
    }

    if (parolaNoua.length < 6) {
      setEroare('Parola trebuie să aibă minim 6 caractere.')
      setLoadingParola(false)
      return
    }

    if (parolaNoua !== confirmaParola) {
      setEroare('Parolele nu coincid.')
      setLoadingParola(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: parolaNoua })

    if (error) {
      setEroare('Eroare la schimbarea parolei.')
      setLoadingParola(false)
      return
    }

    setMesaj('Parola a fost schimbată cu succes!')
    setParolaNoua('')
    setConfirmaParola('')
    setLoadingParola(false)
  }

  function numeRol(rol: string) {
    if (rol === 'admin_platforma') return '👑 Administrator Platformă'
    if (rol === 'admin_conta') return '🏦 Administrator Firmă Contabilitate'
    if (rol === 'contabil') return '👤 Contabil'
    if (rol === 'admin_firma_client') return '🏢 Administrator Firmă Client'
    if (rol === 'angajat_firma_client') return '👥 Angajat Firmă Client'
    return rol
  }

  function getDashboard() {
    if (roluri.some(r => r.rol === 'admin_platforma')) return '/dashboard/super-admin'
    if (roluri.some(r => r.rol === 'admin_conta')) return '/dashboard/admin-conta'
    if (roluri.some(r => r.rol === 'contabil')) return '/dashboard/contabil'
    return '/dashboard/firma'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Se încarcă...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <button onClick={() => router.push(getDashboard())}
              className="text-indigo-600 text-sm hover:underline mb-1 block">
              ← Înapoi la dashboard
            </button>
            <h1 className="text-xl font-bold text-gray-800">Profilul meu</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {mesaj && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
            ✅ {mesaj}
          </div>
        )}
        {eroare && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            ❌ {eroare}
          </div>
        )}

        {/* Roluri */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">Rolurile mele</h2>
          <div className="flex flex-wrap gap-2">
            {roluri.map((r, i) => (
              <span key={i} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold">
                {numeRol(r.rol)}
              </span>
            ))}
          </div>
        </div>

        {/* Date personale */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Date personale</h2>
            <button onClick={() => setEditDate(!editDate)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
              {editDate ? 'Anulează' : '✏️ Modifică'}
            </button>
          </div>

          {!editDate ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 text-sm w-24">Nume</span>
                <span className="font-semibold text-gray-800">{profil?.nume}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 text-sm w-24">Email</span>
                <span className="font-semibold text-gray-800">{profil?.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 text-sm w-24">Membru din</span>
                <span className="font-semibold text-gray-800">
                  {profil?.created_at ? new Date(profil.created_at).toLocaleDateString('ro-RO') : '-'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nume complet</label>
                <input value={nume} onChange={e => setNume(e.target.value)}
                  placeholder="Numele tău"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplu.ro"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
              </div>
              <button onClick={salveazaDate} disabled={loadingDate}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                {loadingDate ? 'Se salvează...' : 'Salvează modificările'}
              </button>
            </div>
          )}
        </div>

        {/* Schimbare parola */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">Schimbă parola</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Parolă nouă</label>
              <input type="password" value={parolaNoua} onChange={e => setParolaNoua(e.target.value)}
                placeholder="Minim 6 caractere"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmă parola nouă</label>
              <input type="password" value={confirmaParola} onChange={e => setConfirmaParola(e.target.value)}
                placeholder="Repetă parola nouă"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <button onClick={schimbaParola} disabled={loadingParola}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
              {loadingParola ? 'Se schimbă parola...' : 'Schimbă parola'}
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}