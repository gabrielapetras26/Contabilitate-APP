'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardAngajat() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firme, setFirme] = useState<any[]>([])
  const [firmaSelectata, setFirmaSelectata] = useState<any>(null)
  const [foldere, setFoldere] = useState<any[]>([])
  const [folderSelectat, setFolderSelectat] = useState<any>(null)
  const [documente, setDocumente] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    verificaUser()
  }, [])

  useEffect(() => {
    if (firmaSelectata) incarcaFoldere(firmaSelectata.id)
  }, [firmaSelectata])

  useEffect(() => {
    if (folderSelectat) incarcaDocumente(folderSelectat.id)
  }, [folderSelectat])

  async function verificaUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUserId(user.id)

    const { data: profilData } = await supabase
      .from('profiluri').select('*').eq('id', user.id).single()
    setProfil(profilData)

    // Incarca firmele la care are acces angajatul
    const { data: alocari } = await supabase
      .from('angajati_firma_client')
      .select('*, firme_cliente(*)')
      .eq('utilizator_id', user.id)
      .eq('activ', true)

    const firmeAlocate = alocari?.map((a: any) => a.firme_cliente) || []
    setFirme(firmeAlocate)
    if (firmeAlocate.length > 0) setFirmaSelectata(firmeAlocate[0])
    setLoading(false)
  }

  async function incarcaFoldere(firmaId: string) {
    const { data } = await supabase
      .from('foldere').select('*')
      .eq('firma_client_id', firmaId)
      .order('created_at', { ascending: true })
    setFoldere(data || [])
    if (data && data.length > 0) {
      const folderUpload = data.find(f => f.tip === 'upload') || data[0]
      setFolderSelectat(folderUpload)
    }
  }

  async function incarcaDocumente(folderId: string) {
    const { data } = await supabase
      .from('documente').select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
    setDocumente(data || [])
  }

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !folderSelectat) return
    if (folderSelectat.tip !== 'upload') {
      setMesaj('Nu poți încărca documente în folderele contabilului.')
      return
    }

    setUploading(true)
    setMesaj('')

    const numeFisier = `${firmaSelectata.id}/${folderSelectat.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documente').upload(numeFisier, file)

    if (error) {
      setMesaj('Eroare la încărcare. Încearcă din nou.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documente').getPublicUrl(numeFisier)

    // Verificam daca folderul e deja marcat gata
    const { data: statusData } = await supabase
      .from('folder_status').select('*')
      .eq('folder_id', folderSelectat.id)
      .eq('marcat_gata', true)
      .single()

    await supabase.from('documente').insert({
      folder_id: folderSelectat.id,
      firma_client_id: firmaSelectata.id,
      nume_fisier: file.name,
      url_fisier: publicUrl,
      tip: 'client',
      status: statusData ? 'nou' : 'incarcat',
      uploaded_by: userId
    })

    setMesaj('Document încărcat cu succes!')
    await incarcaDocumente(folderSelectat.id)
    setUploading(false)
    e.target.value = ''
  }

  async function stergeDocument(docId: string, urlFisier: string, status: string) {
    if (status === 'gata') {
      setMesaj('Nu poți șterge documente marcate ca "Gata".')
      return
    }
    if (!confirm('Ești sigur că vrei să ștergi acest document?')) return
    const path = urlFisier.split('/documente/')[1]
    await supabase.storage.from('documente').remove([path])
    await supabase.from('documente').delete().eq('id', docId)
    setMesaj('Document șters.')
    await incarcaDocumente(folderSelectat.id)
  }

  async function marcheazaGata() {
    await supabase
      .from('documente')
      .update({ status: 'gata' })
      .eq('folder_id', folderSelectat.id)
      .in('status', ['incarcat', 'nou'])

    const { data: existing } = await supabase
      .from('folder_status').select('*')
      .eq('folder_id', folderSelectat.id).single()

    if (existing) {
      await supabase.from('folder_status')
        .update({ marcat_gata: true, marcat_de: userId, marcat_la: new Date().toISOString() })
        .eq('folder_id', folderSelectat.id)
    } else {
      await supabase.from('folder_status').insert({
        folder_id: folderSelectat.id,
        firma_client_id: firmaSelectata.id,
        marcat_gata: true,
        marcat_de: userId,
        marcat_la: new Date().toISOString()
      })
    }

    setMesaj('Contabilul a fost notificat!')
    await incarcaDocumente(folderSelectat.id)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const esteUpload = folderSelectat?.tip === 'upload'
  const areDocumenteNoi = documente.some(d => d.status === 'incarcat' || d.status === 'nou')

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

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
        {/* Firme - stanga */}
        <div className="w-56 shrink-0">
          <h2 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Firmele mele</h2>
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
            <div className="flex gap-4">
              {/* Foldere */}
              <div className="w-44 shrink-0">
                <h2 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-wide">Foldere</h2>
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
                {!folderSelectat ? (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                    <p className="text-gray-400 text-sm">Selectează un folder.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-gray-800">{folderSelectat.nume}</h2>
                      {esteUpload && areDocumenteNoi && (
                        <button onClick={marcheazaGata}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                          ✅ Marchează "Gata"
                        </button>
                      )}
                      {esteUpload && !areDocumenteNoi && documente.length > 0 && (
                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold">
                          ✅ Trimis la contabil
                        </span>
                      )}
                    </div>

                    {mesaj && (
                      <div className={`p-3 rounded-xl mb-4 text-sm ${
                        mesaj.includes('Eroare') || mesaj.includes('Nu poți')
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {mesaj}
                      </div>
                    )}

                    {/* Upload — doar in folderul de upload */}
                    {esteUpload && (
                      <label className="flex items-center gap-3 px-6 py-4 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition mb-4">
                        <span className="text-2xl">📎</span>
                        <div>
                          <p className="font-semibold text-indigo-600">
                            {uploading ? 'Se încarcă...' : 'Apasă pentru a încărca document'}
                          </p>
                          <p className="text-sm text-gray-400">PDF, Excel, imagini acceptate</p>
                        </div>
                        <input type="file" className="hidden" onChange={uploadDocument} disabled={uploading} />
                      </label>
                    )}

                    {!esteUpload && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
                        📋 Acest folder conține documentele finale ale contabilului. Poți doar vizualiza și descărca.
                      </div>
                    )}

                    {/* Lista documente */}
                    {documente.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <span className="text-4xl">📭</span>
                        <p className="text-gray-400 mt-3 text-sm">Nu există documente în acest folder.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documente.map(doc => (
                          <div key={doc.id} className={`flex items-center justify-between p-4 rounded-xl ${
                            doc.status === 'nou' ? 'bg-amber-50 border border-amber-200' : 'bg-white'
                          }`}>
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
                                doc.status === 'finalizat' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {doc.status === 'gata' ? '✅ Gata' :
                                 doc.status === 'nou' ? '🆕 Nou' :
                                 doc.status === 'finalizat' ? '✔️ Final' : '📤 Încărcat'}
                              </span>
                              <a href={doc.url_fisier} target="_blank" rel="noopener noreferrer"
                                className="px-3 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-50 transition">
                                Descarcă
                              </a>
                              {esteUpload && doc.status === 'incarcat' && (
                                <button onClick={() => stergeDocument(doc.id, doc.url_fisier, doc.status)}
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
        </div>
      </div>
    </main>
  )
}