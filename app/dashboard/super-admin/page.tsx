'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardSuperAdmin() {
  const router = useRouter()
  const [firmeContabilitate, setFirmeContabilitate] = useState<any[]>([])
  const [firmeCliente, setFirmeCliente] = useState<any[]>([])
  const [utilizatori, setUtilizatori] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'firme_conta' | 'firme_cliente' | 'utilizatori'>('firme_conta')
  const [mesaj, setMesaj] = useState('')

  useEffect(() => {
    incarcaDate()
  }, [])

  async function incarcaDate() {
    const { data: firmeConta } = await supabase
      .from('firme_contabilitate')
      .select('*')
      .order('created_at', { ascending: false })
    setFirmeContabilitate(firmeConta || [])

    const { data: firmeC } = await supabase
      .from('firme_cliente')
      .select('*')
      .order('created_at', { ascending: false })
    setFirmeCliente(firmeC || [])

    const { data: users } = await supabase
      .from('profiluri')
      .select('*')
      .order('created_at', { ascending: false })
    setUtilizatori(users || [])

    setLoading(false)
  }

  async function toggleFirmaActiva(firmaId: string, activ: boolean) {
    await supabase
      .from('firme_contabilitate')
      .update({ activ: !activ })
      .eq('id', firmaId)
    setMesaj(activ ? 'Firmă dezactivată.' : 'Firmă activată.')
    await incarcaDate()
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
            <p className="text-sm text-red-500 font-semibold">👑 Super Admin</p>
          </div>
          <button onClick={logout}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition">
            Ieși din cont
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Statistici */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-indigo-600">{firmeContabilitate.length}</p>
            <p className="text-gray-500 text-sm mt-1">Firme contabilitate</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-green-600">{firmeCliente.length}</p>
            <p className="text-gray-500 text-sm mt-1">Firme cliente</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{utilizatori.length}</p>
            <p className="text-gray-500 text-sm mt-1">Utilizatori totali</p>
          </div>
        </div>

        {mesaj && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-6 text-sm">
            {mesaj}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('firme_conta')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${
              tab === 'firme_conta' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'
            }`}>
            🏦 Firme contabilitate
          </button>
          <button onClick={() => setTab('firme_cliente')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${
              tab === 'firme_cliente' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'
            }`}>
            🏢 Firme cliente
          </button>
          <button onClick={() => setTab('utilizatori')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${
              tab === 'utilizatori' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'
            }`}>
            👥 Utilizatori
          </button>
        </div>

        {/* Tab Firme Contabilitate */}
        {tab === 'firme_conta' && (
          <div className="space-y-4">
            {firmeContabilitate.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏦</span>
                <p className="text-gray-500 mt-4">Nu există firme de contabilitate înregistrate.</p>
              </div>
            ) : (
              firmeContabilitate.map(firma => (
                <div key={firma.id} className="bg-white rounded-2xl shadow-sm p-6 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        firma.activ ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {firma.activ ? 'Activ' : 'Inactiv'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{firma.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Plan: {firma.plan_abonament} • 
                      Înregistrat: {new Date(firma.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFirmaActiva(firma.id, firma.activ)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      firma.activ
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}>
                    {firma.activ ? 'Dezactivează' : 'Activează'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Firme Cliente */}
        {tab === 'firme_cliente' && (
          <div className="space-y-4">
            {firmeCliente.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏢</span>
                <p className="text-gray-500 mt-4">Nu există firme cliente înregistrate.</p>
              </div>
            ) : (
              firmeCliente.map(firma => (
                <div key={firma.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                  {firma.cui && <p className="text-sm text-gray-500 mt-1">CUI: {firma.cui}</p>}
                  {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    Înregistrat: {new Date(firma.created_at).toLocaleDateString('ro-RO')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Utilizatori */}
        {tab === 'utilizatori' && (
          <div className="space-y-3">
            {utilizatori.map(user => (
              <div key={user.id} className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800">{user.nume}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  user.rol === 'super_admin' ? 'bg-red-100 text-red-700' :
                  user.rol === 'admin_conta' ? 'bg-purple-100 text-purple-700' :
                  user.rol === 'contabil' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {user.rol === 'super_admin' ? '👑 Super Admin' :
                   user.rol === 'admin_conta' ? '🏦 Admin Conta' :
                   user.rol === 'contabil' ? '👤 Contabil' :
                   '🏢 Admin Firmă'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}