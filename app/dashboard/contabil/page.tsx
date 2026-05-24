'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardContabil() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firme, setFirme] = useState<any[]>([])
  const [notificari, setNotificari] = useState<any[]>([])
  const [necitite, setNecitite] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'firme' | 'notificari'>('firme')
  const [lunaSelectata, setLunaSelectata] = useState(new Date().getMonth())
  const [anSelectat, setAnSelectat] = useState(new Date().getFullYear())

  const LUNI = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

  useEffect(() => {
    verificaUser()
  }, [])

  useEffect(() => {
    if (profil) {
      incarcaFirmeCuStatus()
    }
  }, [profil, lunaSelectata, anSelectat])

  async function verificaUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profilData } = await supabase
      .from('profiluri').select('*').eq('id', user.id).single()
    setProfil(profilData)

    await incarcaNotificari(user.id)
    setLoading(false)
  }

  async function incarcaFirmeCuStatus() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Firme alocate contabilului
    const { data: firmeData } = await supabase
      .from('firme_cliente')
      .select('*')
      .eq('admin_conta_id', user.id)

    if (!firmeData) return

    // Pentru fiecare firma verificam statusul documentelor
    const firmeCustomStatus = await Promise.all(firmeData.map(async firma => {
      // Verificam daca are documente gata
      const { data: folderUpload } = await supabase
        .from('foldere')
        .select('*')
        .eq('firma_client_id', firma.id)
        .eq('tip', 'upload')
        .single()

      if (!folderUpload) return { ...firma, statusDoc: 'fara_folder' }

      const { data: statusFolder } = await supabase
        .from('folder_status')
        .select('*')
        .eq('folder_id', folderUpload.id)
        .eq('marcat_gata', true)
        .single()

      // Verificam daca are acte noi
      const { data: acteNoi } = await supabase
        .from('documente')
        .select('id')
        .eq('folder_id', folderUpload.id)
        .eq('status', 'nou')

      // Verificam statusul de lucru
      const { data: statusLucru } = await supabase
        .from('status_lucru')
        .select('*')
        .eq('firma_client_id', firma.id)
        .eq('luna', LUNI[lunaSelectata])
        .eq('an', anSelectat)
        .single()

      let statusDoc = 'asteptare'
      if (acteNoi && acteNoi.length > 0) statusDoc = 'acte_noi'
      else if (statusFolder) statusDoc = 'gata'

      return {
        ...firma,
        statusDoc,
        statusLucru: statusLucru?.status || 'asteptare',
        numarActeNoi: acteNoi?.length || 0
      }
    }))

    setFirme(firmeCustomStatus)
  }

  async function incarcaNotificari(userId: string) {
    const { data } = await supabase
      .from('notificari')
      .select('*, firme_cliente(nume)')
      .eq('utilizator_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotificari(data || [])
    setNecitite(data?.filter(n => !n.citita).length || 0)
  }

  async function marcheazaCitita(notificareId: string) {
    await supabase.from('notificari').update({ citita: true }).eq('id', notificareId)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await incarcaNotificari(user.id)
  }

  async function marcheazaToateCitite() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notificari').update({ citita: true })
      .eq('utilizator_id', user.id).eq('citita', false)
    await incarcaNotificari(user.id)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function culoareStatusDoc(status: string) {
    if (status === 'gata') return 'bg-green-100 text-green-700'
    if (status === 'acte_noi') return 'bg-amber-100 text-amber-700'
    if (status === 'asteptare') return 'bg-gray-100 text-gray-500'
    return 'bg-gray-100 text-gray-500'
  }

  function textStatusDoc(status: string, numarActeNoi: number) {
    if (status === 'gata') return '✅ Gata de operat'
    if (status === 'acte_noi') return `🆕 ${numarActeNoi} acte noi`
    if (status === 'asteptare') return '⏳ În așteptare'
    return '⏳ În așteptare'
  }

  function culoareStatusLucru(status: string) {
    if (status === 'in_lucru') return 'bg-yellow-100 text-yellow-700'
    if (status === 'finalizat') return 'bg-blue-100 text-blue-700'
    return ''
  }

  function textStatusLucru(status: string) {
    if (status === 'in_lucru') return '🔵 În lucru'
    if (status === 'finalizat') return '✔️ Finalizat'
    return ''
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Se încarcă...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Portal Contabilitate</h1>
            <p className="text-sm text-gray-500">Contabil — {profil?.nume}</p>
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('firme')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'firme' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏢 Firmele mele ({firme.length})
          </button>
          <button onClick={() => setTab('notificari')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition relative ${tab === 'notificari' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🔔 Notificări
            {necitite > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {necitite > 9 ? '9+' : necitite}
              </span>
            )}
          </button>
        </div>

        {/* Tab Firme */}
        {tab === 'firme' && (
          <div>
            {/* Selector luna/an */}
            <div className="flex gap-3 mb-4">
              <select value={lunaSelectata} onChange={e => setLunaSelectata(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                {LUNI.map((luna, index) => <option key={index} value={index}>{luna}</option>)}
              </select>
              <select value={anSelectat} onChange={e => setAnSelectat(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                {[2023, 2024, 2025, 2026].map(an => <option key={an} value={an}>{an}</option>)}
              </select>
            </div>

            {firme.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏢</span>
                <p className="text-gray-500 mt-4">Nu ai firme alocate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firme.map(firma => (
                  <div key={firma.id}
                    onClick={() => router.push(`/dashboard/contabil/${firma.id}`)}
                    className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                        {firma.cui && <p className="text-sm text-gray-500 mt-0.5">CUI: {firma.cui}</p>}
                      </div>
                      <span className="text-2xl">🏢</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Status documente */}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${culoareStatusDoc(firma.statusDoc)}`}>
                        {textStatusDoc(firma.statusDoc, firma.numarActeNoi)}
                      </span>

                      {/* Status lucru */}
                      {firma.statusLucru !== 'asteptare' && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${culoareStatusLucru(firma.statusLucru)}`}>
                          {textStatusLucru(firma.statusLucru)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-sm text-indigo-600 font-semibold">Deschide →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Notificari */}
        {tab === 'notificari' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Notificări</h2>
              {necitite > 0 && (
                <button onClick={marcheazaToateCitite}
                  className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition">
                  Marchează toate citite
                </button>
              )}
            </div>

            {notificari.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🔔</span>
                <p className="text-gray-500 mt-4">Nu ai notificări.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notificari.map(notif => (
                  <div key={notif.id}
                    onClick={() => {
                      if (!notif.citita) marcheazaCitita(notif.id)
                      if (notif.firma_client_id) router.push(`/dashboard/contabil/${notif.firma_client_id}`)
                    }}
                    className={`p-4 rounded-2xl cursor-pointer transition ${
                      notif.citita ? 'bg-white' : 'bg-indigo-50 border border-indigo-200'
                    } hover:shadow-md`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {notif.tip === 'gata' ? '✅' :
                           notif.tip === 'acte_noi' ? '🆕' :
                           notif.tip === 'reminder' ? '⏰' : '📧'}
                        </span>
                        <div>
                          <p className={`font-semibold text-sm ${notif.citita ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notif.titlu}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{notif.mesaj}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleDateString('ro-RO')} —{' '}
                            {new Date(notif.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      {!notif.citita && (
                        <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full shrink-0 mt-1"></span>
                      )}
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