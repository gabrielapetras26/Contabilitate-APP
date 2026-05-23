'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardAdminConta() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firmeCliente, setFirmeCliente] = useState<any[]>([])
  const [contabili, setContabili] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'firme' | 'contabili'>('firme')
  const [showAdaugaContabil, setShowAdaugaContabil] = useState(false)
  const [numeContabil, setNumeContabil] = useState('')
  const [emailContabil, setEmailContabil] = useState('')
  const [parolaContabil, setParolaContabil] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [loadingActiune, setLoadingActiune] = useState(false)

  useEffect(() => {
    verificaUser()
  }, [])

  async function verificaUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profilData } = await supabase
      .from('profiluri')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfil(profilData)
    await incarcaDate(profilData?.firma_contabilitate_id)
    setLoading(false)
  }

  async function incarcaDate(firmaContaId: string) {
    const { data: firme } = await supabase
      .from('firme_cliente')
      .select('*, alocare_contabili(contabil_id, profiluri(nume))')
      .eq('firma_contabilitate_id', firmaContaId)
    setFirmeCliente(firme || [])

    const { data: contabiliData } = await supabase
      .from('profiluri')
      .select('*')
      .eq('firma_contabilitate_id', firmaContaId)
      .eq('rol', 'contabil')
    setContabili(contabiliData || [])
  }

  async function adaugaContabil() {
    setLoadingActiune(true)
    setMesaj('')

    if (!numeContabil || !emailContabil || !parolaContabil) {
      setMesaj('Completează toate câmpurile.')
      setLoadingActiune(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailContabil,
      password: parolaContabil,
      options: {
        data: { nume: numeContabil, rol: 'contabil' }
      }
    })

    if (error) {
      setMesaj('Eroare: ' + error.message)
      setLoadingActiune(false)
      return
    }

    if (data.user) {
      await supabase.from('profiluri').insert({
        id: data.user.id,
        nume: numeContabil,
        email: emailContabil,
        rol: 'contabil',
        firma_contabilitate_id: profil?.firma_contabilitate_id
      })
    }

    setMesaj('Contabil adăugat cu succes!')
    setNumeContabil('')
    setEmailContabil('')
    setParolaContabil('')
    setShowAdaugaContabil(false)
    await incarcaDate(profil?.firma_contabilitate_id)
    setLoadingActiune(false)
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
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Portal Contabilitate</h1>
            <p className="text-sm text-gray-500">Admin firmă contabilitate — {profil?.nume}</p>
          </div>
          <button onClick={logout}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition">
            Ieși din cont
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('firme')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${
              tab === 'firme' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'
            }`}>
            🏢 Firme cliente ({firmeCliente.length})
          </button>
          <button onClick={() => setTab('contabili')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${
              tab === 'contabili' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'
            }`}>
            👤 Contabili ({contabili.length})
          </button>
        </div>

        {/* Tab Firme */}
        {tab === 'firme' && (
          <div>
            {firmeCliente.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏢</span>
                <p className="text-gray-500 mt-4">Nu există firme cliente încă.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firmeCliente.map(firma => (
                  <div key={firma.id} className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                        {firma.cui && <p className="text-sm text-gray-500 mt-1">CUI: {firma.cui}</p>}
                        {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                      </div>
                      <span className="text-2xl">🏢</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">Contabili alocați:</p>
                      {firma.alocare_contabili?.length > 0 ? (
                        firma.alocare_contabili.map((a: any, i: number) => (
                          <span key={i} className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs mr-1">
                            {a.profiluri?.nume}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Niciun contabil alocat</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Contabili */}
        {tab === 'contabili' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Contabilii firmei</h2>
              <button onClick={() => setShowAdaugaContabil(!showAdaugaContabil)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                + Adaugă contabil
              </button>
            </div>

            {showAdaugaContabil && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4">Adaugă contabil nou</h3>
                {mesaj && (
                  <div className={`p-3 rounded-xl mb-4 text-sm ${mesaj.includes('succes') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {mesaj}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nume complet</label>
                    <input value={numeContabil} onChange={e => setNumeContabil(e.target.value)}
                      placeholder="Ion Popescu"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input value={emailContabil} onChange={e => setEmailContabil(e.target.value)}
                      placeholder="contabil@firma.ro"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Parolă temporară</label>
                    <input value={parolaContabil} onChange={e => setParolaContabil(e.target.value)}
                      type="password"
                      placeholder="Minim 6 caractere"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={adaugaContabil} disabled={loadingActiune}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                    {loadingActiune ? 'Se salvează...' : 'Salvează'}
                  </button>
                  <button onClick={() => setShowAdaugaContabil(false)}
                    className="px-6 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {contabili.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">👤</span>
                <p className="text-gray-500 mt-4">Nu ai adăugat niciun contabil încă.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contabili.map(contabil => (
                  <div key={contabil.id} className="bg-white rounded-2xl shadow-sm p-6 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{contabil.nume}</h3>
                      <p className="text-sm text-gray-500">{contabil.email}</p>
                    </div>
                    <span className="text-2xl">👤</span>
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