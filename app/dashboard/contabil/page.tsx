'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const LUNI = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

export default function DashboardContabil() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firme, setFirme] = useState<any[]>([])
  const [firmaSelectata, setFirmaSelectata] = useState<any>(null)
  const [documente, setDocumente] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lunaSelectata, setLunaSelectata] = useState(new Date().getMonth())
  const [anSelectat, setAnSelectat] = useState(new Date().getFullYear())

  useEffect(() => {
    verificaUser()
  }, [])

  useEffect(() => {
    if (firmaSelectata) incarcaDocumente(firmaSelectata.id)
  }, [firmaSelectata, lunaSelectata, anSelectat])

  async function verificaUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profilData } = await supabase
      .from('profiluri')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfil(profilData)

    const { data: alocari } = await supabase
      .from('alocare_contabili')
      .select('firma_client_id, firme_cliente(*)')
      .eq('contabil_id', user.id)
      .eq('activ', true)

    const firmeAlocate = alocari?.map((a: any) => a.firme_cliente) || []
    setFirme(firmeAlocate)
    if (firmeAlocate.length > 0) setFirmaSelectata(firmeAlocate[0])
    setLoading(false)
  }

  async function incarcaDocumente(firmaId: string) {
    const { data } = await supabase
      .from('documente')
      .select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .order('created_at', { ascending: false })
    setDocumente(data || [])
  }

  async function schimbaStatus(docId: string, status: string) {
    await supabase
      .from('documente')
      .update({ status })
      .eq('id', docId)
    if (firmaSelectata) await incarcaDocumente(firmaSelectata.id)
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
            <p className="text-sm text-gray-500">Bună ziua, {profil?.nume}!</p>
          </div>
          <button onClick={logout}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition">
            Ieși din cont
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
        {/* Lista firme */}
        <div className="w-64 shrink-0">
          <h2 className="font-bold text-gray-800 mb-3">Firmele mele</h2>
          {firme.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-gray-400 text-sm">Nu ai firme alocate încă.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {firme.map(firma => (
                <button key={firma.id}
                  onClick={() => setFirmaSelectata(firma)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition ${
                    firmaSelectata?.id === firma.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-800 hover:bg-indigo-50'
                  }`}>
                  <p className="font-semibold text-sm">{firma.nume}</p>
                  {firma.cui && <p className={`text-xs mt-1 ${firmaSelectata?.id === firma.id ? 'text-indigo-200' : 'text-gray-400'}`}>{firma.cui}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Documente */}
        <div className="flex-1">
          {!firmaSelectata ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <span className="text-5xl">👈</span>
              <p className="text-gray-500 mt-4">Selectează o firmă din stânga.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-800">{firmaSelectata.nume}</h2>
                <div className="flex gap-3">
                  <select value={lunaSelectata} onChange={e => setLunaSelectata(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                    {LUNI.map((luna, index) => (
                      <option key={index} value={index}>{luna}</option>
                    ))}
                  </select>
                  <select value={anSelectat} onChange={e => setAnSelectat(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                    {[2023, 2024, 2025, 2026].map(an => (
                      <option key={an} value={an}>{an}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                {documente.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-5xl">📭</span>
                    <p className="text-gray-500 mt-4">Nu există documente pentru această perioadă.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documente.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{doc.nume_fisier}</p>
                            <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('ro-RO')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            doc.status === 'gata' ? 'bg-green-100 text-green-700' :
                            doc.status === 'in_lucru' ? 'bg-yellow-100 text-yellow-700' :
                            doc.status === 'finalizat' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {doc.status === 'gata' ? '✅ Gata de lucru' :
                             doc.status === 'in_lucru' ? '⏳ În lucru' :
                             doc.status === 'finalizat' ? '✔️ Finalizat' :
                             '📤 Încărcat'}
                          </span>
                          <a href={doc.url_fisier} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-50 transition">
                            Descarcă
                          </a>
                          {doc.status === 'gata' && (
                            <button onClick={() => schimbaStatus(doc.id, 'in_lucru')}
                              className="px-3 py-1 text-xs text-yellow-600 border border-yellow-200 rounded-full hover:bg-yellow-50 transition">
                              În lucru
                            </button>
                          )}
                          {doc.status === 'in_lucru' && (
                            <button onClick={() => schimbaStatus(doc.id, 'finalizat')}
                              className="px-3 py-1 text-xs text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 transition">
                              Finalizat
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}