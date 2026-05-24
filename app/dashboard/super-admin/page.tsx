'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardSuperAdmin() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firmeContabilitate, setFirmeContabilitate] = useState<any[]>([])
  const [firmeCliente, setFirmeCliente] = useState<any[]>([])
  const [utilizatori, setUtilizatori] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'statistici' | 'firme_conta' | 'firme_cliente' | 'utilizatori'>('statistici')
  const [mesaj, setMesaj] = useState('')

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
    await incarcaDate()
    setLoading(false)
  }

  async function incarcaDate() {
    const { data: firmeConta } = await supabase
      .from('firme_contabilitate')
      .select('*, profiluri(nume, email)')
      .order('created_at', { ascending: false })
    setFirmeContabilitate(firmeConta || [])

    const { data: firmeC } = await supabase
      .from('firme_cliente')
      .select('*')
      .order('created_at', { ascending: false })
    setFirmeCliente(firmeC || [])

    const { data: users } = await supabase
      .from('profiluri')
      .select('*, utilizator_roluri(rol)')
      .order('created_at', { ascending: false })
    setUtilizatori(users || [])
  }

  async function verificaFirma(firmaId: string, verificat: boolean) {
    await supabase
      .from('firme_contabilitate')
      .update({ verificat })
      .eq('id', firmaId)
    setMesaj(verificat ? 'Firmă verificată și aprobată!' : 'Firmă respinsă.')
    await incarcaDate()
  }

  async function toggleFirmaActiva(firmaId: string, activ: boolean) {
    await supabase
      .from('firme_contabilitate')
      .update({ activ: !activ })
      .eq('id', firmaId)
    setMesaj(!activ ? 'Firmă activată.' : 'Firmă dezactivată.')
    await incarcaDate()
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const firmeVerificate = firmeContabilitate.filter(f => f.verificat)
  const firmeInVerificare = firmeContabilitate.filter(f => !f.verificat)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Se încarcă...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Portal Contabilitate</h1>
            <p className="text-sm text-red-500 font-semibold">👑 Super Admin — {profil?.nume}</p>
          </div>
          <button onClick={logout}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition">
            Ieși din cont
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {mesaj && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-6 text-sm">
            {mesaj}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab('statistici')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'statistici' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            📊 Statistici
          </button>
          <button onClick={() => setTab('firme_conta')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'firme_conta' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏦 Firme contabilitate ({firmeContabilitate.length})
            {firmeInVerificare.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                {firmeInVerificare.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('firme_cliente')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'firme_cliente' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏢 Firme cliente ({firmeCliente.length})
          </button>
          <button onClick={() => setTab('utilizatori')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'utilizatori' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            👥 Utilizatori ({utilizatori.length})
          </button>
        </div>

        {/* Tab Statistici */}
        {tab === 'statistici' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <p className="text-3xl font-bold text-amber-600">{firmeInVerificare.length}</p>
                <p className="text-gray-500 text-sm mt-1">În așteptare verificare</p>
              </div>
            </div>

            {/* Firme in asteptare verificare */}
            {firmeInVerificare.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-gray-800 mb-4">⏳ Firme în așteptare verificare CECCAR</h2>
                <div className="space-y-3">
                  {firmeInVerificare.map(firma => (
                    <div key={firma.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div>
                        <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                        <p className="text-sm text-gray-500">CUI: {firma.cui}</p>
                        <p className="text-sm text-gray-500">Admin: {firma.profiluri?.nume} — {firma.profiluri?.email}</p>
                        <p className="text-xs text-gray-400">Înregistrat: {new Date(firma.created_at).toLocaleDateString('ro-RO')}</p>
                        {firma.document_ceccar_url && (
                          <a href={firma.document_ceccar_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline mt-1 block">
                            📎 Vezi document CECCAR
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => verificaFirma(firma.id, true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                          ✅ Aprobă
                        </button>
                        <button onClick={() => verificaFirma(firma.id, false)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-200 transition">
                          ❌ Respinge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {firmeInVerificare.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">✅</span>
                <p className="text-gray-500 mt-4">Nu există firme în așteptare verificare.</p>
              </div>
            )}
          </div>
        )}

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
                <div key={firma.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${firma.verificat ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {firma.verificat ? '✅ Verificat' : '⏳ În verificare'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${firma.activ ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                          {firma.activ ? '🟢 Activ' : '🔴 Inactiv'}
                        </span>
                      </div>
                      {firma.cui && <p className="text-sm text-gray-500">CUI: {firma.cui}</p>}
                      {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                      <p className="text-sm text-gray-500">Admin: {firma.profiluri?.nume}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Înregistrat: {new Date(firma.created_at).toLocaleDateString('ro-RO')}
                      </p>
                      {firma.document_ceccar_url && (
                        <a href={firma.document_ceccar_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline mt-1 block">
                          📎 Vezi document CECCAR
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {!firma.verificat && (
                        <button onClick={() => verificaFirma(firma.id, true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                          ✅ Aprobă
                        </button>
                      )}
                      <button onClick={() => toggleFirmaActiva(firma.id, firma.activ)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${firma.activ ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {firma.activ ? 'Dezactivează' : 'Activează'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Firme Cliente */}
        {tab === 'firme_cliente' && (
          <div className="space-y-3">
            {firmeCliente.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏢</span>
                <p className="text-gray-500 mt-4">Nu există firme cliente înregistrate.</p>
              </div>
            ) : (
              firmeCliente.map(firma => (
                <div key={firma.id} className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                    {firma.cui && <p className="text-sm text-gray-500">CUI: {firma.cui}</p>}
                    {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Înregistrat: {new Date(firma.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    firma.mod_folosire === 'cu_firma_conta'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {firma.mod_folosire === 'cu_firma_conta' ? '🤝 Cu firmă conta' : '🔓 Independent'}
                  </span>
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
                  <p className="text-xs text-gray-400 mt-1">
                    Înregistrat: {new Date(user.created_at).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {user.utilizator_roluri?.map((r: any, i: number) => (
                    <span key={i} className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      r.rol === 'admin_platforma' ? 'bg-red-100 text-red-700' :
                      r.rol === 'admin_conta' ? 'bg-purple-100 text-purple-700' :
                      r.rol === 'contabil' ? 'bg-blue-100 text-blue-700' :
                      r.rol === 'admin_firma_client' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {r.rol === 'admin_platforma' ? '👑 Super Admin' :
                       r.rol === 'admin_conta' ? '🏦 Admin Conta' :
                       r.rol === 'contabil' ? '👤 Contabil' :
                       r.rol === 'admin_firma_client' ? '🏢 Admin Firmă' :
                       '👥 Angajat'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}