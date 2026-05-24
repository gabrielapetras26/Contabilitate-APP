'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const LUNI = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

const DECLARATII_POSIBILE = ['D100', 'D101', 'D112', 'D300', 'D301', 'D390', 'D394', 'D700', 'Bilanț anual']
const OPURI_POSIBILE = ['CAS angajator', 'CASS angajator', 'CAM', 'Impozit salarii', 'TVA de plată', 'Impozit micro', 'Impozit profit']

export default function DashboardContabil() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [roluri, setRoluri] = useState<any[]>([])
  const [firme, setFirme] = useState<any[]>([])
  const [notificari, setNotificari] = useState<any[]>([])
  const [necitite, setNecitite] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'firme' | 'notificari' | 'declaratii' | 'salarizare'>('firme')
  const [lunaSelectata, setLunaSelectata] = useState(new Date().getMonth())
  const [anSelectat, setAnSelectat] = useState(new Date().getFullYear())

  // Date pentru tabel declaratii
  const [tabelDeclaratii, setTabelDeclaratii] = useState<any[]>([])
  const [tabelOpuri, setTabelOpuri] = useState<any[]>([])
  const [viewTabel, setViewTabel] = useState<'declaratii' | 'opuri'>('declaratii')

  // Salarizare
  const [salarizare, setSalarizare] = useState<any[]>([])
  const [firmaSelectataSalarizare, setFirmaSelectataSalarizare] = useState<any>(null)
  const [evenimenteSalarizare, setEvenimenteSalarizare] = useState<any[]>([])
  const [showAdaugaEveniment, setShowAdaugaEveniment] = useState(false)
  const [tipEveniment, setTipEveniment] = useState<'angajare' | 'incetare' | 'modificare'>('angajare')
  const [numeAngajat, setNumeAngajat] = useState('')
  const [dataEveniment, setDataEveniment] = useState('')
  const [detaliiEveniment, setDetaliiEveniment] = useState('')
  const [mesaj, setMesaj] = useState('')

  useEffect(() => {
    verificaUser()
  }, [])

  useEffect(() => {
    if (profil) {
      incarcaFirmeCuStatus()
      incarcaTabelDeclaratii()
      incarcaSalarizare()
    }
  }, [profil, lunaSelectata, anSelectat])

  useEffect(() => {
    if (firmaSelectataSalarizare) {
      incarcaEvenimenteSalarizare(firmaSelectataSalarizare.id)
    }
  }, [firmaSelectataSalarizare, lunaSelectata, anSelectat])

  async function verificaUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profilData } = await supabase
      .from('profiluri').select('*').eq('id', user.id).single()
    setProfil(profilData)

    const { data: roluriData } = await supabase
      .from('utilizator_roluri').select('*')
      .eq('utilizator_id', user.id).eq('activ', true)
    setRoluri(roluriData || [])

    await incarcaNotificari(user.id)
    setLoading(false)
  }

  async function incarcaFirmeCuStatus() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: firmeData } = await supabase
      .from('firme_cliente').select('*').eq('admin_conta_id', user.id)
    if (!firmeData) return

    const firmeCustomStatus = await Promise.all(firmeData.map(async firma => {
      const { data: folderUpload } = await supabase
        .from('foldere').select('*')
        .eq('firma_client_id', firma.id).eq('tip', 'upload').single()

      if (!folderUpload) return { ...firma, statusDoc: 'fara_folder' }

      const { data: statusFolder } = await supabase
        .from('folder_status').select('*')
        .eq('folder_id', folderUpload.id).eq('marcat_gata', true).single()

      const { data: acteNoi } = await supabase
        .from('documente').select('id')
        .eq('folder_id', folderUpload.id).eq('status', 'nou')

      const { data: statusLucru } = await supabase
        .from('status_lucru').select('*')
        .eq('firma_client_id', firma.id)
        .eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat).single()

      let statusDoc = 'asteptare'
      if (acteNoi && acteNoi.length > 0) statusDoc = 'acte_noi'
      else if (statusFolder) statusDoc = 'gata'

      return {
        ...firma, statusDoc,
        statusLucru: statusLucru?.status || 'asteptare',
        numarActeNoi: acteNoi?.length || 0
      }
    }))

    setFirme(firmeCustomStatus)
  }

  async function incarcaTabelDeclaratii() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: firmeData } = await supabase
      .from('firme_cliente').select('*, profil_fiscal(*)')
      .eq('admin_conta_id', user.id)
    if (!firmeData) return

    const tabelDec = await Promise.all(firmeData.map(async firma => {
      const { data: declaratii } = await supabase
        .from('declaratii').select('*')
        .eq('firma_client_id', firma.id)
        .eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat)

      const declaratiiMap: any = {}
      DECLARATII_POSIBILE.forEach(d => {
        const dec = declaratii?.find(x => x.nume === d)
        declaratiiMap[d] = dec ? { exista: true, depusa: dec.depusa, id: dec.id } : { exista: false }
      })

      return { firma, declaratii: declaratiiMap }
    }))

    setTabelDeclaratii(tabelDec)

    const tabelOp = await Promise.all(firmeData.map(async firma => {
      const { data: opuri } = await supabase
        .from('opuri_stat').select('*')
        .eq('firma_client_id', firma.id)
        .eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat)

      const opuriMap: any = {}
      OPURI_POSIBILE.forEach(o => {
        const op = opuri?.find(x => x.nume === o)
        opuriMap[o] = op ? { exista: true, achitat: op.achitat, necesar: op.necesar, id: op.id } : { exista: false }
      })

      return { firma, opuri: opuriMap }
    }))

    setTabelOpuri(tabelOp)
  }

  async function incarcaSalarizare() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: firmeData } = await supabase
      .from('firme_cliente').select('*, profil_fiscal(are_salariati)')
      .eq('admin_conta_id', user.id)

    const firmeCuSalariati = firmeData?.filter(f => f.profil_fiscal?.are_salariati) || []

    const salarizareData = await Promise.all(firmeCuSalariati.map(async firma => {
      const { data: statusSal } = await supabase
        .from('salarizare').select('*')
        .eq('firma_client_id', firma.id)
        .eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat).single()

      const { data: evenimente } = await supabase
        .from('evenimente_salarizare').select('*')
        .eq('firma_client_id', firma.id)
        .eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat)

      return {
        ...firma,
        statusSalarizare: statusSal?.status || 'neinceput',
        salarizareId: statusSal?.id,
        evenimente: evenimente || []
      }
    }))

    setSalarizare(salarizareData)
    if (salarizareData.length > 0 && !firmaSelectataSalarizare) {
      setFirmaSelectataSalarizare(salarizareData[0])
    }
  }

  async function incarcaEvenimenteSalarizare(firmaId: string) {
    const { data } = await supabase
      .from('evenimente_salarizare').select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat)
      .order('created_at', { ascending: true })
    setEvenimenteSalarizare(data || [])
  }

  async function schimbaStatusSalarizare(firmaId: string, salarizareId: string | undefined, status: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (salarizareId) {
      await supabase.from('salarizare').update({ status, updated_at: new Date().toISOString() }).eq('id', salarizareId)
    } else {
      await supabase.from('salarizare').insert({
        firma_client_id: firmaId, luna: LUNI[lunaSelectata],
        an: anSelectat, status, contabil_id: user.id
      })
    }
    await incarcaSalarizare()
  }

  async function adaugaEveniment() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !firmaSelectataSalarizare || !numeAngajat) return

    await supabase.from('evenimente_salarizare').insert({
      firma_client_id: firmaSelectataSalarizare.id,
      luna: LUNI[lunaSelectata], an: anSelectat,
      tip: tipEveniment, nume_angajat: numeAngajat,
      data_eveniment: dataEveniment || null,
      detalii: detaliiEveniment, created_by: user.id
    })

    setNumeAngajat(''); setDataEveniment(''); setDetaliiEveniment('')
    setShowAdaugaEveniment(false)
    await incarcaEvenimenteSalarizare(firmaSelectataSalarizare.id)
    await incarcaSalarizare()
  }

  async function stergeEveniment(id: string) {
    if (!confirm('Ești sigur?')) return
    await supabase.from('evenimente_salarizare').delete().eq('id', id)
    if (firmaSelectataSalarizare) await incarcaEvenimenteSalarizare(firmaSelectataSalarizare.id)
  }

  async function toggleDeclaratie(firmaId: string, numeDeclaratie: string, id: string | undefined, depusa: boolean) {
    if (id) {
      await supabase.from('declaratii').update({
        depusa: !depusa,
        depusa_la: !depusa ? new Date().toISOString() : null
      }).eq('id', id)
    }
    await incarcaTabelDeclaratii()
  }

  async function toggleOpStat(id: string, achitat: boolean) {
    await supabase.from('opuri_stat').update({
      achitat: !achitat,
      achitat_la: !achitat ? new Date().toISOString() : null
    }).eq('id', id)
    await incarcaTabelDeclaratii()
  }

  async function schimbaRol(rol: string) {
    if (rol === 'admin_platforma') router.push('/dashboard/super-admin')
    else if (rol === 'admin_conta') router.push('/dashboard/admin-conta')
    else if (rol === 'contabil') router.push('/dashboard/contabil')
    else router.push('/dashboard/firma')
  }

  async function incarcaNotificari(userId: string) {
    const { data } = await supabase
      .from('notificari').select('*, firme_cliente(nume)')
      .eq('utilizator_id', userId)
      .order('created_at', { ascending: false }).limit(50)
    setNotificari(data || [])
    setNecitite(data?.filter(n => !n.citita).length || 0)
  }

  async function marcheazaCitita(id: string) {
    await supabase.from('notificari').update({ citita: true }).eq('id', id)
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
    return 'bg-gray-100 text-gray-500'
  }

  function textStatusDoc(status: string, numarActeNoi: number) {
    if (status === 'gata') return '✅ Gata de operat'
    if (status === 'acte_noi') return `🆕 ${numarActeNoi} acte noi`
    return '⏳ În așteptare'
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
          <div className="flex gap-2 items-center flex-wrap">
            {/* Selector rol */}
            {roluri.length > 1 && (
              <select onChange={e => schimbaRol(e.target.value)} defaultValue="contabil"
                className="px-3 py-2 text-sm border border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 text-indigo-600">
                {roluri.map(r => (
                  <option key={r.id} value={r.rol}>
                    {r.rol === 'admin_platforma' ? '👑 Super Admin' :
                     r.rol === 'admin_conta' ? '🏦 Admin Conta' :
                     r.rol === 'contabil' ? '👤 Contabil' :
                     r.rol === 'admin_firma_client' ? '🏢 Admin Firmă' : r.rol}
                  </option>
                ))}
              </select>
            )}
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab('firme')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'firme' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏢 Firme ({firme.length})
          </button>
          <button onClick={() => setTab('declaratii')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'declaratii' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            📋 Declarații & OP-uri
          </button>
          <button onClick={() => setTab('salarizare')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'salarizare' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            👥 Salarizare
          </button>
          <button onClick={() => setTab('notificari')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition relative ${tab === 'notificari' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${culoareStatusDoc(firma.statusDoc)}`}>
                        {textStatusDoc(firma.statusDoc, firma.numarActeNoi)}
                      </span>
                      {firma.statusLucru === 'in_lucru' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">🔵 În lucru</span>
                      )}
                      {firma.statusLucru === 'finalizat' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">✔️ Finalizat</span>
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

        {/* Tab Declaratii & OP-uri */}
        {tab === 'declaratii' && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div className="flex gap-3">
                <select value={lunaSelectata} onChange={e => setLunaSelectata(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  {LUNI.map((luna, index) => <option key={index} value={index}>{luna}</option>)}
                </select>
                <select value={anSelectat} onChange={e => setAnSelectat(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  {[2023, 2024, 2025, 2026].map(an => <option key={an} value={an}>{an}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewTabel('declaratii')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${viewTabel === 'declaratii' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
                  📋 Declarații
                </button>
                <button onClick={() => setViewTabel('opuri')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${viewTabel === 'opuri' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
                  💰 OP-uri stat
                </button>
              </div>
            </div>

            {/* Tabel Declaratii */}
            {viewTabel === 'declaratii' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-bold text-gray-700 sticky left-0 bg-gray-50 min-w-48">
                          Firmă
                        </th>
                        {DECLARATII_POSIBILE.map(d => (
                          <th key={d} className="py-3 px-3 font-bold text-gray-700 text-center min-w-20">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tabelDeclaratii.map((row, i) => (
                        <tr key={row.firma.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className={`py-3 px-4 font-semibold text-gray-800 sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <div>
                              <p className="font-bold">{row.firma.nume}</p>
                              {row.firma.cui && <p className="text-xs text-gray-400">CUI: {row.firma.cui}</p>}
                            </div>
                          </td>
                          {DECLARATII_POSIBILE.map(d => {
                            const dec = row.declaratii[d]
                            if (!dec.exista) {
                              return (
                                <td key={d} className="py-3 px-3 text-center">
                                  <div className="w-8 h-8 bg-gray-200 rounded mx-auto" title="Nu se aplică"></div>
                                </td>
                              )
                            }
                            return (
                              <td key={d} className="py-3 px-3 text-center">
                                <button
                                  onClick={() => toggleDeclaratie(row.firma.id, d, dec.id, dec.depusa)}
                                  className={`w-8 h-8 rounded border-2 mx-auto flex items-center justify-center transition ${
                                    dec.depusa
                                      ? 'bg-green-100 border-green-400 text-green-700'
                                      : 'bg-white border-gray-300 hover:border-indigo-400'
                                  }`}
                                  title={dec.depusa ? 'Depusă — apasă pentru a anula' : 'Nedepusă — apasă pentru a marca depusă'}>
                                  {dec.depusa ? '✓' : ''}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tabelDeclaratii.length === 0 && (
                    <div className="text-center py-12">
                      <span className="text-4xl">📋</span>
                      <p className="text-gray-400 mt-3">Nu există date pentru această perioadă.</p>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span>Nu se aplică</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                    <span>Nedepusă</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded flex items-center justify-center text-green-700 font-bold">✓</div>
                    <span>Depusă</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabel OP-uri */}
            {viewTabel === 'opuri' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-bold text-gray-700 sticky left-0 bg-gray-50 min-w-48">
                          Firmă
                        </th>
                        {OPURI_POSIBILE.map(o => (
                          <th key={o} className="py-3 px-3 font-bold text-gray-700 text-center min-w-24 text-xs">
                            {o}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tabelOpuri.map((row, i) => (
                        <tr key={row.firma.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className={`py-3 px-4 font-semibold text-gray-800 sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <div>
                              <p className="font-bold">{row.firma.nume}</p>
                              {row.firma.cui && <p className="text-xs text-gray-400">CUI: {row.firma.cui}</p>}
                            </div>
                          </td>
                          {OPURI_POSIBILE.map(o => {
                            const op = row.opuri[o]
                            if (!op.exista) {
                              return (
                                <td key={o} className="py-3 px-3 text-center">
                                  <div className="w-8 h-8 bg-gray-200 rounded mx-auto" title="Nu se aplică"></div>
                                </td>
                              )
                            }
                            if (!op.necesar) {
                              return (
                                <td key={o} className="py-3 px-3 text-center">
                                  <div className="w-8 h-8 bg-gray-100 rounded mx-auto flex items-center justify-center text-gray-400 text-xs" title="Nu e necesar">N/A</div>
                                </td>
                              )
                            }
                            return (
                              <td key={o} className="py-3 px-3 text-center">
                                <button
                                  onClick={() => toggleOpStat(op.id, op.achitat)}
                                  className={`w-8 h-8 rounded border-2 mx-auto flex items-center justify-center transition ${
                                    op.achitat
                                      ? 'bg-green-100 border-green-400 text-green-700'
                                      : 'bg-white border-gray-300 hover:border-indigo-400'
                                  }`}
                                  title={op.achitat ? 'Achitat' : 'Neachitat'}>
                                  {op.achitat ? '✓' : ''}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tabelOpuri.length === 0 && (
                    <div className="text-center py-12">
                      <span className="text-4xl">💰</span>
                      <p className="text-gray-400 mt-3">Nu există date pentru această perioadă.</p>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span>Nu se aplică</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">N/A</div>
                    <span>Nu e necesar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                    <span>Neachitat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded flex items-center justify-center text-green-700 font-bold">✓</div>
                    <span>Achitat</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Salarizare */}
        {tab === 'salarizare' && (
          <div className="flex gap-6">
            {/* Lista firme cu salariati */}
            <div className="w-56 shrink-0">
              <div className="flex gap-3 mb-3">
                <select value={lunaSelectata} onChange={e => setLunaSelectata(Number(e.target.value))}
                  className="flex-1 px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500">
                  {LUNI.map((luna, index) => <option key={index} value={index}>{luna}</option>)}
                </select>
                <select value={anSelectat} onChange={e => setAnSelectat(Number(e.target.value))}
                  className="w-20 px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500">
                  {[2023, 2024, 2025, 2026].map(an => <option key={an} value={an}>{an}</option>)}
                </select>
              </div>

              <h2 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-wide">Firme cu salariați</h2>
              {salarizare.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                  <p className="text-gray-400 text-xs">Nu există firme cu salariați.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {salarizare.map(firma => (
                    <button key={firma.id}
                      onClick={() => setFirmaSelectataSalarizare(firma)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition text-xs ${
                        firmaSelectataSalarizare?.id === firma.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-gray-800 hover:bg-indigo-50'
                      }`}>
                      <p className="font-semibold">{firma.nume}</p>
                      <p className={`text-xs mt-0.5 ${firmaSelectataSalarizare?.id === firma.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {firma.statusSalarizare === 'finalizat' ? '✅ Finalizat' :
                         firma.statusSalarizare === 'in_lucru' ? '🔵 În lucru' : '⏳ Neînceput'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detalii salarizare firma selectata */}
            <div className="flex-1">
              {!firmaSelectataSalarizare ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <span className="text-5xl">👥</span>
                  <p className="text-gray-500 mt-4">Selectează o firmă din stânga.</p>
                </div>
              ) : (
                <>
                  {/* Header firma */}
                  <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="font-bold text-gray-800 text-lg">{firmaSelectataSalarizare.nume}</h2>
                        <p className="text-sm text-gray-500">Salarizare {LUNI[lunaSelectata]} {anSelectat}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => schimbaStatusSalarizare(firmaSelectataSalarizare.id, firmaSelectataSalarizare.salarizareId, 'in_lucru')}
                          className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition">
                          În lucru
                        </button>
                        <button onClick={() => schimbaStatusSalarizare(firmaSelectataSalarizare.id, firmaSelectataSalarizare.salarizareId, 'finalizat')}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition">
                          Finalizat
                        </button>
                        <button onClick={() => schimbaStatusSalarizare(firmaSelectataSalarizare.id, firmaSelectataSalarizare.salarizareId, 'neinceput')}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition">
                          Resetează
                        </button>
                      </div>
                    </div>
                  </div>

                  {mesaj && (
                    <div className="bg-green-50 text-green-700 rounded-xl p-3 mb-4 text-sm">{mesaj}</div>
                  )}

                  {/* Evenimente */}
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800">Evenimente luna {LUNI[lunaSelectata]}</h3>
                      <button onClick={() => setShowAdaugaEveniment(!showAdaugaEveniment)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                        + Adaugă eveniment
                      </button>
                    </div>

                    {showAdaugaEveniment && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Tip eveniment</label>
                            <select value={tipEveniment} onChange={e => setTipEveniment(e.target.value as any)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                              <option value="angajare">🟢 Angajare nouă</option>
                              <option value="incetare">🔴 Încetare contract</option>
                              <option value="modificare">🟡 Modificare contract</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Nume angajat *</label>
                            <input value={numeAngajat} onChange={e => setNumeAngajat(e.target.value)}
                              placeholder="Nume Prenume"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Data evenimentului</label>
                            <input type="date" value={dataEveniment} onChange={e => setDataEveniment(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Detalii</label>
                            <input value={detaliiEveniment} onChange={e => setDetaliiEveniment(e.target.value)}
                              placeholder="Ex: Modificare salariu, funcție, etc."
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={adaugaEveniment}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                            Salvează
                          </button>
                          <button onClick={() => setShowAdaugaEveniment(false)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                            Anulează
                          </button>
                        </div>
                      </div>
                    )}

                    {evenimenteSalarizare.length === 0 ? (
                      <div className="text-center py-8">
                        <span className="text-4xl">👥</span>
                        <p className="text-gray-400 mt-3 text-sm">Nu există evenimente pentru această lună.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {evenimenteSalarizare.map(ev => (
                          <div key={ev.id} className={`flex items-center justify-between p-4 rounded-xl ${
                            ev.tip === 'angajare' ? 'bg-green-50 border border-green-200' :
                            ev.tip === 'incetare' ? 'bg-red-50 border border-red-200' :
                            'bg-amber-50 border border-amber-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <span className="text-xl">
                                {ev.tip === 'angajare' ? '🟢' : ev.tip === 'incetare' ? '🔴' : '🟡'}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{ev.nume_angajat}</p>
                                <p className="text-xs text-gray-500">
                                  {ev.tip === 'angajare' ? 'Angajare nouă' :
                                   ev.tip === 'incetare' ? 'Încetare contract' : 'Modificare contract'}
                                  {ev.data_eveniment && ` — ${new Date(ev.data_eveniment).toLocaleDateString('ro-RO')}`}
                                </p>
                                {ev.detalii && <p className="text-xs text-gray-400 mt-0.5">{ev.detalii}</p>}
                              </div>
                            </div>
                            <button onClick={() => stergeEveniment(ev.id)}
                              className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition">
                              Șterge
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
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
                          {notif.tip === 'gata' ? '✅' : notif.tip === 'acte_noi' ? '🆕' :
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