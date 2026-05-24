'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function FirmeAlocate({ contabilId, firmeDisponibile, adminContaId }: any) {
  const [alocare, setAlocare] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [firmaDeAdaugat, setFirmaDeAdaugat] = useState('')

  useEffect(() => {
    incarcaAlocare()
  }, [contabilId])

  async function incarcaAlocare() {
    const { data } = await supabase
      .from('alocare_contabili')
      .select('*, firme_cliente(*)')
      .eq('contabil_id', contabilId)
      .eq('activ', true)
    setAlocare(data || [])
    setLoading(false)
  }

  async function adaugaAlocare() {
    if (!firmaDeAdaugat) return
    await supabase.from('alocare_contabili').insert({
      contabil_id: contabilId,
      firma_client_id: firmaDeAdaugat,
      admin_conta_id: adminContaId,
      activ: true
    })
    setFirmaDeAdaugat('')
    await incarcaAlocare()
  }

  async function eliminaAlocare(alocareId: string) {
    if (!confirm('Elimini alocarea acestui contabil?')) return
    await supabase
      .from('alocare_contabili')
      .update({ activ: false })
      .eq('id', alocareId)
    await incarcaAlocare()
  }

  const firmeNealocate = firmeDisponibile.filter(
    (f: any) => !alocare.some((a: any) => a.firma_client_id === f.id)
  )

  if (loading) return <p className="text-xs text-gray-400">Se încarcă...</p>

  return (
    <div>
      {alocare.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">Nicio firmă alocată încă.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {alocare.map((a: any) => (
            <div key={a.id} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
              <span>{a.firme_cliente?.nume}</span>
              <button onClick={() => eliminaAlocare(a.id)}
                className="ml-1 text-indigo-400 hover:text-red-500 font-bold">×</button>
            </div>
          ))}
        </div>
      )}

      {firmeNealocate.length > 0 && (
        <div className="flex gap-2">
          <select value={firmaDeAdaugat} onChange={e => setFirmaDeAdaugat(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
            <option value="">Alege firmă de alocat...</option>
            {firmeNealocate.map((f: any) => (
              <option key={f.id} value={f.id}>{f.nume}</option>
            ))}
          </select>
          <button onClick={adaugaAlocare}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            Alocă
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardAdminConta() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firmeContabilitate, setFirmeContabilitate] = useState<any[]>([])
  const [firmeCliente, setFirmeCliente] = useState<any[]>([])
  const [contabili, setContabili] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'firme_conta' | 'firme_cliente' | 'contabili'>('firme_conta')
  const [mesaj, setMesaj] = useState('')
  const [loadingActiune, setLoadingActiune] = useState(false)

  const [showAdaugaFirmaConta, setShowAdaugaFirmaConta] = useState(false)
  const [numeFirmaConta, setNumeFirmaConta] = useState('')
  const [cuiFirmaConta, setCuiFirmaConta] = useState('')
  const [emailFirmaConta, setEmailFirmaConta] = useState('')
  const [telefonFirmaConta, setTelefonFirmaConta] = useState('')
  const [documentCeccar, setDocumentCeccar] = useState<File | null>(null)
  const [esteClient, setEsteClient] = useState(false)

  const [showAdaugaFirmaClient, setShowAdaugaFirmaClient] = useState(false)
  const [cuiCautare, setCuiCautare] = useState('')
  const [firmaGasita, setFirmaGasita] = useState<any>(null)
  const [numeFirmaClient, setNumeFirmaClient] = useState('')
  const [cuiFirmaClient, setCuiFirmaClient] = useState('')
  const [emailFirmaClient, setEmailFirmaClient] = useState('')
  const [telefonFirmaClient, setTelefonFirmaClient] = useState('')

  const [showAdaugaContabil, setShowAdaugaContabil] = useState(false)
  const [numeContabil, setNumeContabil] = useState('')
  const [emailContabil, setEmailContabil] = useState('')
  const [parolaContabil, setParolaContabil] = useState('')

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
    await incarcaDate(user.id)
    setLoading(false)
  }

  async function incarcaDate(userId: string) {
    const { data: firmeConta } = await supabase
      .from('firme_contabilitate')
      .select('*')
      .eq('admin_id', userId)
    setFirmeContabilitate(firmeConta || [])

    const { data: firmeC } = await supabase
      .from('firme_cliente')
      .select('*')
      .eq('admin_conta_id', userId)
    setFirmeCliente(firmeC || [])

    const { data: alocari } = await supabase
      .from('alocare_contabili')
      .select('contabil_id')
      .eq('admin_conta_id', userId)
      .eq('activ', true)

    const contabiliIds = [...new Set(alocari?.map((a: any) => a.contabil_id) || [])]

    const { data: contabiliData } = await supabase
      .from('profiluri')
      .select('*')
      .in('id', contabiliIds.length > 0 ? contabiliIds : ['00000000-0000-0000-0000-000000000000'])
    setContabili(contabiliData || [])
  }

  async function adaugaFirmaConta() {
    setLoadingActiune(true)
    setMesaj('')

    if (!numeFirmaConta || !cuiFirmaConta || !telefonFirmaConta) {
      setMesaj('Completează toate câmpurile obligatorii.')
      setLoadingActiune(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    let documentUrl = ''
    if (documentCeccar) {
      const numeFisier = `ceccar/${user?.id}_${Date.now()}_${documentCeccar.name}`
      const { error: uploadError } = await supabase.storage
        .from('documente')
        .upload(numeFisier, documentCeccar)
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('documente')
          .getPublicUrl(numeFisier)
        documentUrl = urlData.publicUrl
      }
    }

    const { data: firma, error } = await supabase
      .from('firme_contabilitate')
      .insert({
        nume: numeFirmaConta,
        cui: cuiFirmaConta,
        email: emailFirmaConta,
        telefon: telefonFirmaConta,
        document_ceccar_url: documentUrl,
        admin_id: user?.id,
        verificat: false,
        este_si_client: esteClient
      })
      .select()
      .single()

    if (error) {
      setMesaj('Eroare la adăugarea firmei.')
      setLoadingActiune(false)
      return
    }

    if (esteClient && firma) {
      const { data: firmaClient } = await supabase
        .from('firme_cliente')
        .insert({
          nume: numeFirmaConta,
          cui: cuiFirmaConta,
          email: emailFirmaConta,
          telefon: telefonFirmaConta,
          admin_id: user?.id,
          admin_conta_id: user?.id,
          mod_folosire: 'cu_firma_conta',
          asociere_confirmata: true
        })
        .select()
        .single()

      if (firmaClient) {
        await supabase
          .from('firme_contabilitate')
          .update({ firma_client_id: firmaClient.id })
          .eq('id', firma.id)

        await supabase.from('foldere').insert({
          firma_client_id: firmaClient.id,
          nume: 'Documente încărcate',
          tip: 'upload',
          creat_de: user?.id
        })
      }
    }

    setMesaj('Firmă adăugată cu succes!')
    setNumeFirmaConta('')
    setCuiFirmaConta('')
    setEmailFirmaConta('')
    setTelefonFirmaConta('')
    setDocumentCeccar(null)
    setEsteClient(false)
    setShowAdaugaFirmaConta(false)
    await incarcaDate(user?.id!)
    setLoadingActiune(false)
  }

  async function cautaFirmaDupaCui() {
    if (!cuiCautare) return
    const { data } = await supabase
      .from('firme_cliente')
      .select('*')
      .eq('cui', cuiCautare)
      .single()

    if (data) {
      setFirmaGasita(data)
      setNumeFirmaClient(data.nume)
      setCuiFirmaClient(data.cui)
      setEmailFirmaClient(data.email || '')
      setTelefonFirmaClient(data.telefon || '')
    } else {
      setFirmaGasita(null)
      setMesaj('Firma nu e înregistrată încă. O poți adăuga manual.')
    }
  }

  async function adaugaFirmaClient() {
    setLoadingActiune(true)
    setMesaj('')

    if (!numeFirmaClient || !cuiFirmaClient) {
      setMesaj('Denumirea și CUI-ul sunt obligatorii.')
      setLoadingActiune(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (firmaGasita) {
      await supabase
        .from('firme_cliente')
        .update({
          admin_conta_id: user?.id,
          asociere_confirmata: true
        })
        .eq('id', firmaGasita.id)
    } else {
      const { data: firmaNoua } = await supabase
        .from('firme_cliente')
        .insert({
          nume: numeFirmaClient,
          cui: cuiFirmaClient,
          email: emailFirmaClient,
          telefon: telefonFirmaClient,
          admin_conta_id: user?.id,
          mod_folosire: 'cu_firma_conta',
          asociere_confirmata: true
        })
        .select()
        .single()

      if (firmaNoua) {
        await supabase.from('foldere').insert({
          firma_client_id: firmaNoua.id,
          nume: 'Documente încărcate',
          tip: 'upload',
          creat_de: user?.id
        })
      }
    }

    setMesaj('Firmă client adăugată cu succes!')
    setCuiCautare('')
    setFirmaGasita(null)
    setNumeFirmaClient('')
    setCuiFirmaClient('')
    setEmailFirmaClient('')
    setTelefonFirmaClient('')
    setShowAdaugaFirmaClient(false)
    await incarcaDate(user?.id!)
    setLoadingActiune(false)
  }

  async function adaugaContabil() {
    setLoadingActiune(true)
    setMesaj('')

    if (!numeContabil || !emailContabil || !parolaContabil) {
      setMesaj('Completează toate câmpurile.')
      setLoadingActiune(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.auth.signUp({
      email: emailContabil,
      password: parolaContabil,
      options: { data: { nume: numeContabil } }
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
        email: emailContabil
      })
      await supabase.from('utilizator_roluri').insert({
        utilizator_id: data.user.id,
        rol: 'contabil'
      })
      await supabase.from('alocare_contabili').insert({
        contabil_id: data.user.id,
        admin_conta_id: user?.id,
        activ: true
      })
    }

    setMesaj('Contabil adăugat cu succes!')
    setNumeContabil('')
    setEmailContabil('')
    setParolaContabil('')
    setShowAdaugaContabil(false)
    await incarcaDate(user?.id!)
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
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Portal Contabilitate</h1>
            <p className="text-sm text-gray-500">Admin firmă contabilitate — {profil?.nume}</p>
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        {mesaj && (
          <div className={`p-3 rounded-xl mb-6 text-sm ${mesaj.includes('succes') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {mesaj}
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab('firme_conta')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'firme_conta' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏦 Firmele mele de contabilitate ({firmeContabilitate.length})
          </button>
          <button onClick={() => setTab('firme_cliente')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'firme_cliente' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏢 Firme cliente ({firmeCliente.length})
          </button>
          <button onClick={() => setTab('contabili')}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition ${tab === 'contabili' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            👤 Contabili ({contabili.length})
          </button>
        </div>

        {/* Tab Firme Contabilitate */}
        {tab === 'firme_conta' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Firmele mele de contabilitate</h2>
              <button onClick={() => setShowAdaugaFirmaConta(!showAdaugaFirmaConta)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                + Adaugă firmă contabilitate
              </button>
            </div>

            {showAdaugaFirmaConta && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4">Adaugă firmă de contabilitate</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Denumire firmă *</label>
                    <input value={numeFirmaConta} onChange={e => setNumeFirmaConta(e.target.value)}
                      placeholder="SC Conta Expert SRL"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">CUI *</label>
                    <input value={cuiFirmaConta} onChange={e => setCuiFirmaConta(e.target.value)}
                      placeholder="RO12345678"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input value={emailFirmaConta} onChange={e => setEmailFirmaConta(e.target.value)}
                      placeholder="office@conta.ro"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Telefon *</label>
                    <input value={telefonFirmaConta} onChange={e => setTelefonFirmaConta(e.target.value)}
                      placeholder="07xx xxx xxx"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Autorizație CECCAR</label>
                    <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition">
                      <span className="text-xl">📎</span>
                      <p className="font-semibold text-indigo-600 text-sm">
                        {documentCeccar ? documentCeccar.name : 'Încarcă documentul CECCAR'}
                      </p>
                      <input type="file" accept=".pdf" className="hidden"
                        onChange={e => setDocumentCeccar(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={esteClient}
                        onChange={e => setEsteClient(e.target.checked)}
                        className="w-5 h-5 rounded accent-indigo-600" />
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Folosește și ca firmă client</p>
                        <p className="text-xs text-gray-500">Firma ta va apărea și ca firmă client pentru gestionarea propriilor documente</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={adaugaFirmaConta} disabled={loadingActiune}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                    {loadingActiune ? 'Se salvează...' : 'Salvează'}
                  </button>
                  <button onClick={() => setShowAdaugaFirmaConta(false)}
                    className="px-6 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {firmeContabilitate.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏦</span>
                <p className="text-gray-500 mt-4">Nu ai adăugat nicio firmă de contabilitate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firmeContabilitate.map(firma => (
                  <div key={firma.id} className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                        {firma.cui && <p className="text-sm text-gray-500 mt-1">CUI: {firma.cui}</p>}
                        {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                        {firma.telefon && <p className="text-sm text-gray-500">{firma.telefon}</p>}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${firma.verificat ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {firma.verificat ? '✅ Verificat' : '⏳ În verificare'}
                        </span>
                        {firma.este_si_client && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                            👥 și Client
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Firme Cliente */}
        {tab === 'firme_cliente' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Portofoliu firme cliente</h2>
              <button onClick={() => setShowAdaugaFirmaClient(!showAdaugaFirmaClient)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                + Adaugă firmă client
              </button>
            </div>

            {showAdaugaFirmaClient && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4">Adaugă firmă client</h3>
                <p className="text-sm text-gray-500 mb-4">Caută firma după CUI — dacă e înregistrată pe platformă o găsești automat.</p>
                <div className="flex gap-3 mb-4">
                  <input value={cuiCautare} onChange={e => setCuiCautare(e.target.value)}
                    placeholder="Caută după CUI..."
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  <button onClick={cautaFirmaDupaCui}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                    Caută
                  </button>
                </div>

                {firmaGasita && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                    <p className="text-green-700 font-semibold text-sm">✅ Firmă găsită: {firmaGasita.nume}</p>
                    <p className="text-green-600 text-xs mt-1">CUI: {firmaGasita.cui}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Denumire firmă *</label>
                    <input value={numeFirmaClient} onChange={e => setNumeFirmaClient(e.target.value)}
                      placeholder="SC Exemplu SRL"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">CUI *</label>
                    <input value={cuiFirmaClient} onChange={e => setCuiFirmaClient(e.target.value)}
                      placeholder="RO12345678"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input value={emailFirmaClient} onChange={e => setEmailFirmaClient(e.target.value)}
                      placeholder="office@firma.ro"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Telefon</label>
                    <input value={telefonFirmaClient} onChange={e => setTelefonFirmaClient(e.target.value)}
                      placeholder="07xx xxx xxx"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={adaugaFirmaClient} disabled={loadingActiune}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                    {loadingActiune ? 'Se salvează...' : 'Adaugă în portofoliu'}
                  </button>
                  <button onClick={() => setShowAdaugaFirmaClient(false)}
                    className="px-6 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {firmeCliente.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <span className="text-5xl">🏢</span>
                <p className="text-gray-500 mt-4">Nu ai firme cliente în portofoliu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firmeCliente.map(firma => (
                  <div key={firma.id}
                    onClick={() => router.push(`/dashboard/contabil/${firma.id}`)}
                    className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                        {firma.cui && <p className="text-sm text-gray-500 mt-1">CUI: {firma.cui}</p>}
                        {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                      </div>
                      <span className="text-2xl">🏢</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <span className="text-sm text-indigo-600 font-semibold">Vezi documente →</span>
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
              <h2 className="font-bold text-gray-800">Contabilii mei</h2>
              <button onClick={() => setShowAdaugaContabil(!showAdaugaContabil)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                + Adaugă contabil
              </button>
            </div>

            {showAdaugaContabil && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4">Adaugă contabil nou</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nume complet *</label>
                    <input value={numeContabil} onChange={e => setNumeContabil(e.target.value)}
                      placeholder="Ion Popescu"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                    <input value={emailContabil} onChange={e => setEmailContabil(e.target.value)}
                      placeholder="contabil@firma.ro"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Parolă temporară *</label>
                    <input value={parolaContabil} onChange={e => setParolaContabil(e.target.value)}
                      type="password" placeholder="Minim 6 caractere"
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
                <p className="text-gray-500 mt-4">Nu ai adăugat niciun contabil.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contabili.map(contabil => (
                  <div key={contabil.id} className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800">{contabil.nume}</h3>
                        <p className="text-sm text-gray-500">{contabil.email}</p>
                      </div>
                      <span className="text-2xl">👤</span>
                    </div>
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Firme alocate</p>
                      <FirmeAlocate
                        contabilId={contabil.id}
                        firmeDisponibile={firmeCliente}
                        adminContaId={profil?.id}
                      />
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