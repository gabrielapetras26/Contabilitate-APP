'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardFirma() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firme, setFirme] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'firme' | 'angajati'>('firme')
  const [angajati, setAngajati] = useState<any[]>([])
  const [mesaj, setMesaj] = useState('')
  const [loadingActiune, setLoadingActiune] = useState(false)

  // Adauga angajat
  const [showAdaugaAngajat, setShowAdaugaAngajat] = useState(false)
  const [numeAngajat, setNumeAngajat] = useState('')
  const [emailAngajat, setEmailAngajat] = useState('')
  const [parolaAngajat, setParolaAngajat] = useState('')

  useEffect(() => {
    verificaUser()
  }, [])

  async function verificaUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profilData } = await supabase
      .from('profiluri').select('*').eq('id', user.id).single()
    setProfil(profilData)

    await incarcaFirme(user.id)
    await incarcaAngajati(user.id)
    setLoading(false)
  }

  async function incarcaFirme(userId: string) {
    const { data } = await supabase
      .from('firme_cliente').select('*').eq('admin_id', userId)
    setFirme(data || [])
  }

  async function incarcaAngajati(userId: string) {
    const { data: firmeData } = await supabase
      .from('firme_cliente').select('id').eq('admin_id', userId)

    if (!firmeData || firmeData.length === 0) return

    const firmeIds = firmeData.map(f => f.id)
    const { data } = await supabase
      .from('angajati_firma_client')
      .select('*, profiluri(nume, email), firme_cliente(nume)')
      .in('firma_client_id', firmeIds)
      .eq('activ', true)
    setAngajati(data || [])
  }

  async function adaugaAngajat() {
    setLoadingActiune(true)
    setMesaj('')

    if (!numeAngajat || !emailAngajat || !parolaAngajat) {
      setMesaj('Completează toate câmpurile.')
      setLoadingActiune(false)
      return
    }

    if (firme.length === 0) {
      setMesaj('Adaugă mai întâi o firmă.')
      setLoadingActiune(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailAngajat,
      password: parolaAngajat,
      options: { data: { nume: numeAngajat } }
    })

    if (error) {
      setMesaj('Eroare: ' + error.message)
      setLoadingActiune(false)
      return
    }

    if (data.user) {
      await supabase.from('profiluri').insert({
        id: data.user.id,
        nume: numeAngajat,
        email: emailAngajat
      })

      await supabase.from('utilizator_roluri').insert({
        utilizator_id: data.user.id,
        rol: 'angajat_firma_client'
      })

      // Adaugam angajatul la toate firmele adminului
      for (const firma of firme) {
        await supabase.from('angajati_firma_client').insert({
          utilizator_id: data.user.id,
          firma_client_id: firma.id,
          activ: true
        })
      }
    }

    setMesaj('Angajat adăugat cu succes!')
    setNumeAngajat('')
    setEmailAngajat('')
    setParolaAngajat('')
    setShowAdaugaAngajat(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) await incarcaAngajati(user.id)
    setLoadingActiune(false)
  }

  async function dezactiveazaAngajat(angajatId: string) {
    if (!confirm('Ești sigur că vrei să dezactivezi acest angajat?')) return
    await supabase
      .from('angajati_firma_client')
      .update({ activ: false })
      .eq('id', angajatId)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) await incarcaAngajati(user.id)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Se încarcă...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Portal Contabilitate</h1>
            <p className="text-sm text-gray-500">Bună ziua, {profil?.nume}!</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/profil')}
              className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition">
              👤 Profilul meu
            </button>
            <button onClick={logout}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition">
              Ieși din cont
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {mesaj && (
          <div className={`p-3 rounded-xl mb-6 text-sm ${mesaj.includes('succes') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {mesaj}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('firme')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'firme' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏢 Firmele mele ({firme.length})
          </button>
          <button onClick={() => setTab('angajati')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'angajati' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            👥 Angajați ({angajati.length})
          </button>
        </div>

        {/* Tab Firme */}
        {tab === 'firme' && (
          <div>
            {firme.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏢</span>
                <p className="text-gray-500 mt-4">Nu ai nicio firmă înregistrată.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firme.map(firma => (
                  <div key={firma.id}
                    onClick={() => router.push(`/dashboard/firma/${firma.id}`)}
                    className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                        {firma.cui && <p className="text-sm text-gray-500 mt-1">CUI: {firma.cui}</p>}
                        {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                        {firma.telefon && <p className="text-sm text-gray-500">{firma.telefon}</p>}
                      </div>
                      <span className="text-2xl">🏢</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        firma.mod_folosire === 'cu_firma_conta'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {firma.mod_folosire === 'cu_firma_conta' ? '🤝 Cu firmă contabilitate' : '🔓 Independent'}
                      </span>
                      <span className="text-sm text-indigo-600 font-semibold">Vezi documente →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Angajati */}
        {tab === 'angajati' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Angajați cu acces la documente</h2>
              <button onClick={() => setShowAdaugaAngajat(!showAdaugaAngajat)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                + Adaugă angajat
              </button>
            </div>

            {showAdaugaAngajat && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4">Adaugă angajat nou</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nume complet *</label>
                    <input value={numeAngajat} onChange={e => setNumeAngajat(e.target.value)}
                      placeholder="Ion Popescu"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                    <input value={emailAngajat} onChange={e => setEmailAngajat(e.target.value)}
                      placeholder="angajat@firma.ro"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Parolă temporară *</label>
                    <input value={parolaAngajat} onChange={e => setParolaAngajat(e.target.value)}
                      type="password" placeholder="Minim 6 caractere"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Angajatul va avea acces la documentele tuturor firmelor tale.
                </p>
                <div className="flex gap-3 mt-4">
                  <button onClick={adaugaAngajat} disabled={loadingActiune}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                    {loadingActiune ? 'Se salvează...' : 'Salvează'}
                  </button>
                  <button onClick={() => setShowAdaugaAngajat(false)}
                    className="px-6 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {angajati.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">👥</span>
                <p className="text-gray-500 mt-4">Nu ai adăugat niciun angajat.</p>
                <p className="text-gray-400 text-sm mt-1">Angajații pot încărca și gestiona documente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {angajati.map(angajat => (
                  <div key={angajat.id} className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{angajat.profiluri?.nume}</h3>
                      <p className="text-sm text-gray-500">{angajat.profiluri?.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Firmă: {angajat.firme_cliente?.nume}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        🟢 Activ
                      </span>
                      <button onClick={() => dezactiveazaAngajat(angajat.id)}
                        className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition">
                        Dezactivează
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}