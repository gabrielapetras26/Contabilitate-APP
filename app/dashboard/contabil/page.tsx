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
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'documente' | 'declaratii' | 'opuri'>('documente')
  const [lunaSelectata, setLunaSelectata] = useState(new Date().getMonth())
  const [anSelectat, setAnSelectat] = useState(new Date().getFullYear())
  const [foldere, setFoldere] = useState<any[]>([])
  const [folderSelectat, setFolderSelectat] = useState<any>(null)
  const [documente, setDocumente] = useState<any[]>([])
  const [statusLucru, setStatusLucru] = useState<any>(null)
  const [declaratii, setDeclaratii] = useState<any[]>([])
  const [opuri, setOpuri] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [mesaj, setMesaj] = useState('')

  // Declaratii
  const [showAdaugaDeclaratie, setShowAdaugaDeclaratie] = useState(false)
  const [numeDeclaratie, setNumeDeclaratie] = useState('')
  const [descriereDeclaratie, setDescriereDeclaratie] = useState('')
  const [termenDeclaratie, setTermenDeclaratie] = useState('')

  // OP-uri
  const [showAdaugaOp, setShowAdaugaOp] = useState(false)
  const [sumaOp, setSumaOp] = useState('')
  const [descriereOp, setDescriereOp] = useState('')
  const [fisierOp, setFisierOp] = useState<File | null>(null)

  useEffect(() => {
    verificaUser()
  }, [])

  useEffect(() => {
    if (firmaSelectata) {
      incarcaFoldere(firmaSelectata.id)
      incarcaStatusLucru(firmaSelectata.id)
      incarcaDeclaratii(firmaSelectata.id)
      incarcaOpuri(firmaSelectata.id)
    }
  }, [firmaSelectata, lunaSelectata, anSelectat])

  useEffect(() => {
    if (folderSelectat) incarcaDocumente(folderSelectat.id)
  }, [folderSelectat])

  async function verificaUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profilData } = await supabase
      .from('profiluri')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfil(profilData)

    const { data: firmeData } = await supabase
      .from('firme_cliente')
      .select('*')
      .eq('admin_conta_id', user.id)
    setFirme(firmeData || [])
    if (firmeData && firmeData.length > 0) setFirmaSelectata(firmeData[0])
    setLoading(false)
  }

  async function incarcaFoldere(firmaId: string) {
    const { data } = await supabase
      .from('foldere')
      .select('*')
      .eq('firma_client_id', firmaId)
      .order('created_at', { ascending: true })
    setFoldere(data || [])
    if (data && data.length > 0) setFolderSelectat(data[0])
  }

  async function incarcaDocumente(folderId: string) {
    const { data } = await supabase
      .from('documente')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
    setDocumente(data || [])
  }

  async function incarcaStatusLucru(firmaId: string) {
    const { data } = await supabase
      .from('status_lucru')
      .select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .single()
    setStatusLucru(data)
  }

  async function incarcaDeclaratii(firmaId: string) {
    const { data } = await supabase
      .from('declaratii')
      .select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .order('created_at', { ascending: true })
    setDeclaratii(data || [])
  }

  async function incarcaOpuri(firmaId: string) {
    const { data } = await supabase
      .from('opuri')
      .select('*')
      .eq('firma_client_id', firmaId)
      .order('created_at', { ascending: false })
    setOpuri(data || [])
  }

  async function schimbaStatusLucru(status: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (statusLucru) {
      await supabase
        .from('status_lucru')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', statusLucru.id)
    } else {
      await supabase.from('status_lucru').insert({
        firma_client_id: firmaSelectata.id,
        contabil_id: user?.id,
        luna: LUNI[lunaSelectata],
        an: anSelectat,
        status
      })
    }
    await incarcaStatusLucru(firmaSelectata.id)
  }

  async function adaugaFolderLunar() {
    const { data: { user } } = await supabase.auth.getUser()
    const numeLuna = `${LUNI[lunaSelectata]} ${anSelectat}`
    const { error } = await supabase.from('foldere').insert({
      firma_client_id: firmaSelectata.id,
      nume: numeLuna,
      tip: 'lunar',
      luna: LUNI[lunaSelectata],
      an: anSelectat,
      creat_de: user?.id
    })
    if (!error) {
      setMesaj('Folder lunar creat!')
      await incarcaFoldere(firmaSelectata.id)
    }
  }

  async function uploadDocumentFinal(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !folderSelectat) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const numeFisier = `${firmaSelectata.id}/${folderSelectat.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documente').upload(numeFisier, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documente').getPublicUrl(numeFisier)
      await supabase.from('documente').insert({
        folder_id: folderSelectat.id,
        firma_client_id: firmaSelectata.id,
        nume_fisier: file.name,
        url_fisier: publicUrl,
        tip: 'final',
        status: 'finalizat',
        uploaded_by: user?.id
      })
      setMesaj('Document încărcat!')
      await incarcaDocumente(folderSelectat.id)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function stergeDocument(docId: string, urlFisier: string) {
    if (!confirm('Ești sigur?')) return
    const path = urlFisier.split('/documente/')[1]
    await supabase.storage.from('documente').remove([path])
    await supabase.from('documente').delete().eq('id', docId)
    await incarcaDocumente(folderSelectat.id)
  }

  async function adaugaDeclaratie() {
    if (!numeDeclaratie) return
    await supabase.from('declaratii').insert({
      firma_client_id: firmaSelectata.id,
      nume: numeDeclaratie,
      descriere: descriereDeclaratie,
      termen: termenDeclaratie,
      luna: LUNI[lunaSelectata],
      an: anSelectat,
      depusa: false
    })
    setNumeDeclaratie('')
    setDescriereDeclaratie('')
    setTermenDeclaratie('')
    setShowAdaugaDeclaratie(false)
    await incarcaDeclaratii(firmaSelectata.id)
  }

  async function toggleDeclaratie(id: string, depusa: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('declaratii').update({
      depusa: !depusa,
      depusa_de: !depusa ? user?.id : null,
      depusa_la: !depusa ? new Date().toISOString() : null
    }).eq('id', id)
    await incarcaDeclaratii(firmaSelectata.id)
  }

  async function uploadOp(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const numeFisier = `opuri/${firmaSelectata.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documente').upload(numeFisier, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documente').getPublicUrl(numeFisier)
      await supabase.from('opuri').insert({
        firma_client_id: firmaSelectata.id,
        nume_fisier: file.name,
        url_fisier: publicUrl,
        suma: sumaOp,
        descriere: descriereOp,
        uploaded_by: user?.id
      })
      setMesaj('OP încărcat cu succes!')
      setSumaOp('')
      setDescriereOp('')
      setFisierOp(null)
      setShowAdaugaOp(false)
      await incarcaOpuri(firmaSelectata.id)
    }
    setUploading(false)
    e.target.value = ''
  }

  function culoareStatus(status: string) {
    if (status === 'asteptare') return 'bg-gray-100 text-gray-600'
    if (status === 'in_lucru') return 'bg-yellow-100 text-yellow-700'
    if (status === 'finalizat') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  function numeStatus(status: string) {
    if (status === 'asteptare') return '⏳ În așteptare'
    if (status === 'in_lucru') return '🔵 În lucru'
    if (status === 'finalizat') return '✅ Finalizat'
    return '⏳ În așteptare'
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Portal Contabilitate</h1>
            <p className="text-sm text-gray-500">Contabil — {profil?.nume}</p>
          </div>
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

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        {/* Lista firme - stanga */}
        <div className="w-56 shrink-0">
          <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Firme cliente</h2>
          {firme.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-gray-400 text-sm">Nu ai firme alocate.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {firme.map(firma => (
                <button key={firma.id}
                  onClick={() => setFirmaSelectata(firma)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition text-sm ${
                    firmaSelectata?.id === firma.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-800 hover:bg-indigo-50'
                  }`}>
                  <p className="font-semibold">{firma.nume}</p>
                  {firma.cui && <p className={`text-xs mt-0.5 ${firmaSelectata?.id === firma.id ? 'text-indigo-200' : 'text-gray-400'}`}>{firma.cui}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Continut principal */}
        <div className="flex-1">
          {!firmaSelectata ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <span className="text-5xl">👈</span>
              <p className="text-gray-500 mt-4">Selectează o firmă din stânga.</p>
            </div>
          ) : (
            <>
              {/* Header firma + status lucru */}
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-gray-800 text-lg">{firmaSelectata.nume}</h2>
                    {firmaSelectata.cui && <p className="text-sm text-gray-500">CUI: {firmaSelectata.cui}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${culoareStatus(statusLucru?.status || 'asteptare')}`}>
                      {numeStatus(statusLucru?.status || 'asteptare')}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => schimbaStatusLucru('in_lucru')}
                        className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition">
                        În lucru
                      </button>
                      <button onClick={() => schimbaStatusLucru('finalizat')}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition">
                        Finalizat
                      </button>
                      <button onClick={() => schimbaStatusLucru('asteptare')}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition">
                        Resetează
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selector luna/an */}
                <div className="flex gap-3 mt-4">
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

              {mesaj && (
                <div className="bg-green-50 text-green-700 rounded-xl p-3 mb-4 text-sm">{mesaj}</div>
              )}

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setTab('documente')}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'documente' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
                  📄 Documente
                </button>
                <button onClick={() => setTab('declaratii')}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'declaratii' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
                  📋 Declarații ({declaratii.length})
                </button>
                <button onClick={() => setTab('opuri')}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'opuri' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
                  💳 OP-uri ({opuri.length})
                </button>
              </div>

              {/* Tab Documente */}
              {tab === 'documente' && (
                <div className="flex gap-4">
                  {/* Foldere */}
                  <div className="w-44 shrink-0">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase">Foldere</p>
                      <button onClick={adaugaFolderLunar}
                        className="text-xs text-indigo-600 hover:underline">+ Lunar</button>
                    </div>
                    <div className="space-y-1">
                      {foldere.map(folder => (
                        <button key={folder.id}
                          onClick={() => setFolderSelectat(folder)}
                          className={`w-full text-left px-3 py-2 rounded-xl transition text-xs ${
                            folderSelectat?.id === folder.id
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-gray-800 hover:bg-indigo-50'
                          }`}>
                          <span className="mr-1">{folder.tip === 'upload' ? '📤' : '📁'}</span>
                          {folder.nume}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Documente */}
                  <div className="flex-1">
                    {folderSelectat && (
                      <>
                        {folderSelectat.tip === 'lunar' && (
                          <label className="flex items-center gap-3 px-6 py-4 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition mb-4">
                            <span className="text-2xl">📎</span>
                            <div>
                              <p className="font-semibold text-indigo-600 text-sm">
                                {uploading ? 'Se încarcă...' : 'Încarcă document final'}
                              </p>
                              <p className="text-xs text-gray-400">PDF, Excel acceptate</p>
                            </div>
                            <input type="file" className="hidden" onChange={uploadDocumentFinal} disabled={uploading} />
                          </label>
                        )}

                        {documente.length === 0 ? (
                          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                            <span className="text-4xl">📭</span>
                            <p className="text-gray-400 mt-3 text-sm">Nu există documente.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {documente.map(doc => (
                              <div key={doc.id} className={`flex items-center justify-between p-4 rounded-xl ${doc.status === 'nou' ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">📄</span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-gray-800 text-sm">{doc.nume_fisier}</p>
                                      {doc.status === 'nou' && (
                                        <span className="px-2 py-0.5 bg-amber-400 text-white rounded-full text-xs font-bold">NOU</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('ro-RO')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    doc.status === 'gata' || doc.status === 'nou' ? 'bg-green-100 text-green-700' :
                                    doc.status === 'in_lucru' ? 'bg-yellow-100 text-yellow-700' :
                                    doc.status === 'finalizat' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {doc.status === 'gata' ? '✅ Gata' :
                                     doc.status === 'nou' ? '🆕 Nou' :
                                     doc.status === 'in_lucru' ? '⏳ În lucru' :
                                     doc.status === 'finalizat' ? '✔️ Final' : '📤 Încărcat'}
                                  </span>
                                  <a href={doc.url_fisier} target="_blank" rel="noopener noreferrer"
                                    className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-50 transition">
                                    Descarcă
                                  </a>
                                  {folderSelectat.tip === 'lunar' && (
                                    <button onClick={() => stergeDocument(doc.id, doc.url_fisier)}
                                      className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition">
                                      Șterge
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Declaratii */}
              {tab === 'declaratii' && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">Declarații {LUNI[lunaSelectata]} {anSelectat}</h3>
                    <button onClick={() => setShowAdaugaDeclaratie(!showAdaugaDeclaratie)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                      + Adaugă declarație
                    </button>
                  </div>

                  {showAdaugaDeclaratie && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Tip declarație *</label>
                          <input value={numeDeclaratie} onChange={e => setNumeDeclaratie(e.target.value)}
                            placeholder="Ex: D300, D394, D112"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Descriere</label>
                          <input value={descriereDeclaratie} onChange={e => setDescriereDeclaratie(e.target.value)}
                            placeholder="Ex: Declaratie TVA"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Termen</label>
                          <input value={termenDeclaratie} onChange={e => setTermenDeclaratie(e.target.value)}
                            placeholder="Ex: 25 ale lunii"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={adaugaDeclaratie}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                          Salvează
                        </button>
                        <button onClick={() => setShowAdaugaDeclaratie(false)}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                          Anulează
                        </button>
                      </div>
                    </div>
                  )}

                  {declaratii.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-4xl">📋</span>
                      <p className="text-gray-400 mt-3 text-sm">Nu există declarații pentru această perioadă.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {declaratii.map(dec => (
                        <div key={dec.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={dec.depusa}
                              onChange={() => toggleDeclaratie(dec.id, dec.depusa)}
                              className="w-5 h-5 rounded accent-indigo-600 cursor-pointer" />
                            <div>
                              <p className={`font-semibold text-sm ${dec.depusa ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {dec.nume}
                              </p>
                              {dec.descriere && <p className="text-xs text-gray-500">{dec.descriere}</p>}
                              {dec.termen && <p className="text-xs text-gray-400">Termen: {dec.termen}</p>}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dec.depusa ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {dec.depusa ? '✅ Depusă' : '⏳ Nedepusă'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab OP-uri */}
              {tab === 'opuri' && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800">OP-uri</h3>
                    <button onClick={() => setShowAdaugaOp(!showAdaugaOp)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                      + Adaugă OP
                    </button>
                  </div>

                  {showAdaugaOp && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Sumă</label>
                          <input value={sumaOp} onChange={e => setSumaOp(e.target.value)}
                            placeholder="Ex: 1500 RON"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Descriere</label>
                          <input value={descriereOp} onChange={e => setDescriereOp(e.target.value)}
                            placeholder="Ex: Plată furnizor"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition">
                        <span className="text-xl">📎</span>
                        <p className="font-semibold text-indigo-600 text-sm">
                          {uploading ? 'Se încarcă...' : 'Selectează fișierul OP'}
                        </p>
                        <input type="file" className="hidden" onChange={uploadOp} disabled={uploading} />
                      </label>
                    </div>
                  )}

                  {opuri.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-4xl">💳</span>
                      <p className="text-gray-400 mt-3 text-sm">Nu există OP-uri încărcate.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {opuri.map(op => (
                        <div key={op.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">💳</span>
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{op.nume_fisier}</p>
                              {op.suma && <p className="text-xs text-gray-500">Sumă: {op.suma}</p>}
                              {op.descriere && <p className="text-xs text-gray-500">{op.descriere}</p>}
                              <p className="text-xs text-gray-400">{new Date(op.created_at).toLocaleDateString('ro-RO')}</p>
                            </div>
                          </div>
                          <a href={op.url_fisier} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-50 transition">
                            Descarcă
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}