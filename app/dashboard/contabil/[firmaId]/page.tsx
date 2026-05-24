'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const LUNI = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

const TRIMESTRE: { [key: number]: number[] } = {
  1: [0, 1, 2],
  2: [3, 4, 5],
  3: [6, 7, 8],
  4: [9, 10, 11]
}

function getTrimestru(luna: number): number {
  if (luna <= 2) return 1
  if (luna <= 5) return 2
  if (luna <= 8) return 3
  return 4
}

function esteUltimaLunaTrimestru(luna: number): boolean {
  return [2, 5, 8, 11].includes(luna)
}

function genereazaDeclaratii(profil: any, luna: number, an: number) {
  const declaratii: any[] = []
  const trimestru = getTrimestru(luna)
  const ultimaLunaTrimestru = esteUltimaLunaTrimestru(luna)
  const esteDecembrie = luna === 11

  // D100 — Micro sau profit, trimestrial (T1-T4)
  if (profil.sistem_impozitare === 'micro' || profil.sistem_impozitare === 'profit') {
    if (ultimaLunaTrimestru) {
      declaratii.push({
        nume: 'D100',
        descriere: `Impozit ${profil.sistem_impozitare === 'micro' ? 'microîntreprindere' : 'pe profit'} — Trimestrul ${trimestru}`,
        frecventa: 'trimestrial',
        trimestru,
        termen_actual: 25,
        generata_automat: true
      })
    }
  }

  // D101 — Impozit profit anual, doar T4
  if (profil.sistem_impozitare === 'profit' && esteDecembrie) {
    declaratii.push({
      nume: 'D101',
      descriere: 'Impozit pe profit anual',
      frecventa: 'anual',
      trimestru: 4,
      termen_actual: 25,
      generata_automat: true
    })
  }

  // D112 — Salariati, lunar
  if (profil.are_salariati) {
    declaratii.push({
      nume: 'D112',
      descriere: 'Declarație salarii și contribuții sociale',
      frecventa: 'lunar',
      termen_actual: 25,
      generata_automat: true
    })
  }

  // D300 — Platitor TVA
  if (profil.tva === 'lunar') {
    declaratii.push({
      nume: 'D300',
      descriere: 'Decontul de TVA lunar',
      frecventa: 'lunar',
      termen_actual: 25,
      generata_automat: true
    })
    // D394 corelat cu D300 lunar
    declaratii.push({
      nume: 'D394',
      descriere: 'Declarație informativă TVA lunar',
      frecventa: 'lunar',
      termen_actual: 25,
      generata_automat: true
    })
  }

  if (profil.tva === 'trimestrial' && ultimaLunaTrimestru) {
    declaratii.push({
      nume: 'D300',
      descriere: `Decontul de TVA — Trimestrul ${trimestru}`,
      frecventa: 'trimestrial',
      trimestru,
      termen_actual: 25,
      generata_automat: true
    })
    // D394 corelat cu D300 trimestrial
    declaratii.push({
      nume: 'D394',
      descriere: `Declarație informativă TVA — Trimestrul ${trimestru}`,
      frecventa: 'trimestrial',
      trimestru,
      termen_actual: 25,
      generata_automat: true
    })
  }

  // D301 — Neplatitor TVA + CIF intracomunitar + achizitii
  if (profil.tva === 'neplatitor' && profil.cif_intracomunitar && profil.achizitii_intracomunitare) {
    declaratii.push({
      nume: 'D301',
      descriere: 'Declarație achiziții intracomunitare — neplatitor TVA',
      frecventa: 'lunar',
      termen_actual: 25,
      generata_automat: true
    })
  }

  // D390 — CIF intracomunitar + achizitii/vanzari intracomunitare
  if (profil.cif_intracomunitar && (profil.achizitii_intracomunitare || profil.vanzari_intracomunitare)) {
    declaratii.push({
      nume: 'D390',
      descriere: 'Declarație recapitulativă achiziții/vânzări intracomunitare',
      frecventa: 'lunar',
      termen_actual: 25,
      generata_automat: true
    })
  }

  // Bilant anual — toate firmele, doar decembrie
  if (esteDecembrie) {
    declaratii.push({
      nume: 'Bilanț anual',
      descriere: 'Situații financiare anuale',
      frecventa: 'anual',
      termen_actual: 25,
      generata_automat: true
    })
  }

  return declaratii
}

export default function FirmaContabil() {
  const router = useRouter()
  const params = useParams()
  const firmaId = params.firmaId as string

  const [firma, setFirma] = useState<any>(null)
  const [profilFiscal, setProfilFiscal] = useState<any>(null)
  const [declaratii, setDeclaratii] = useState<any[]>([])
  const [foldere, setFoldere] = useState<any[]>([])
  const [folderSelectat, setFolderSelectat] = useState<any>(null)
  const [documente, setDocumente] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'documente' | 'declaratii' | 'profil_fiscal' | 'opuri'>('profil_fiscal')
  const [lunaSelectata, setLunaSelectata] = useState(new Date().getMonth())
  const [anSelectat, setAnSelectat] = useState(new Date().getFullYear())
  const [statusLucru, setStatusLucru] = useState<any>(null)
  const [opuri, setOpuri] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [userId, setUserId] = useState('')

  // Profil fiscal
  const [editProfilFiscal, setEditProfilFiscal] = useState(false)
  const [tipSocietate, setTipSocietate] = useState('srl')
  const [sistemImpozitare, setSistemImpozitare] = useState('micro')
  const [areSalariati, setAreSalariati] = useState(false)
  const [tva, setTva] = useState('neplatitor')
  const [cifIntracomunitar, setCifIntracomunitar] = useState(false)
  const [achizitiiIntracomunitare, setAchizitiiIntracomunitare] = useState(false)
  const [vanzariIntracomunitare, setVanzariIntracomunitare] = useState(false)

  // Declaratii
  const [showAdaugaDeclaratie, setShowAdaugaDeclaratie] = useState(false)
  const [numeDeclaratie, setNumeDeclaratie] = useState('')
  const [descriereDeclaratie, setDescriereDeclaratie] = useState('')
  const [termenDeclaratie, setTermenDeclaratie] = useState(25)
  const [justificareDeclaratie, setJustificareDeclaratie] = useState('')

  // OP-uri
  const [showAdaugaOp, setShowAdaugaOp] = useState(false)
  const [sumaOp, setSumaOp] = useState('')
  const [descriereOp, setDescriereOp] = useState('')

  useEffect(() => {
    incarcaDate()
  }, [])

  useEffect(() => {
    if (firma) {
      incarcaDeclaratii()
      incarcaStatusLucru()
    }
  }, [firma, lunaSelectata, anSelectat])

  useEffect(() => {
    if (folderSelectat) incarcaDocumente(folderSelectat.id)
  }, [folderSelectat])

  async function incarcaDate() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setUserId(user.id)

    const { data: firmaData } = await supabase
      .from('firme_cliente')
      .select('*')
      .eq('id', firmaId)
      .single()
    setFirma(firmaData)

    const { data: profilData } = await supabase
      .from('profil_fiscal')
      .select('*')
      .eq('firma_client_id', firmaId)
      .single()

    if (profilData) {
      setProfilFiscal(profilData)
      setTipSocietate(profilData.tip_societate)
      setSistemImpozitare(profilData.sistem_impozitare)
      setAreSalariati(profilData.are_salariati)
      setTva(profilData.tva)
      setCifIntracomunitar(profilData.cif_intracomunitar)
      setAchizitiiIntracomunitare(profilData.achizitii_intracomunitare)
      setVanzariIntracomunitare(profilData.vanzari_intracomunitare)
    }

    const { data: foldereData } = await supabase
      .from('foldere')
      .select('*')
      .eq('firma_client_id', firmaId)
      .order('created_at', { ascending: true })
    setFoldere(foldereData || [])
    if (foldereData && foldereData.length > 0) setFolderSelectat(foldereData[0])

    const { data: opuriData } = await supabase
      .from('opuri')
      .select('*')
      .eq('firma_client_id', firmaId)
      .order('created_at', { ascending: false })
    setOpuri(opuriData || [])

    setLoading(false)
  }

  async function incarcaDeclaratii() {
    const { data } = await supabase
      .from('declaratii')
      .select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .order('created_at', { ascending: true })
    setDeclaratii(data || [])
  }

  async function incarcaStatusLucru() {
    const { data } = await supabase
      .from('status_lucru')
      .select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .single()
    setStatusLucru(data)
  }

  async function incarcaDocumente(folderId: string) {
    const { data } = await supabase
      .from('documente')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
    setDocumente(data || [])
  }

  async function salveazaProfilFiscal() {
    const profilNou = {
      firma_client_id: firmaId,
      tip_societate: tipSocietate,
      sistem_impozitare: sistemImpozitare,
      are_salariati: areSalariati,
      tva,
      cif_intracomunitar: cifIntracomunitar,
      achizitii_intracomunitare: achizitiiIntracomunitare,
      vanzari_intracomunitare: vanzariIntracomunitare,
      updated_at: new Date().toISOString()
    }

    if (profilFiscal) {
      await supabase.from('profil_fiscal').update(profilNou).eq('id', profilFiscal.id)
    } else {
      await supabase.from('profil_fiscal').insert(profilNou)
    }

    setMesaj('Profil fiscal salvat!')
    setEditProfilFiscal(false)
    await incarcaDate()
  }

  async function genereazaDeclaratiiAutomat() {
    if (!profilFiscal) {
      setMesaj('Completează mai întâi profilul fiscal al firmei.')
      return
    }

    const declaratiiDeAdaugat = genereazaDeclaratii(profilFiscal, lunaSelectata, anSelectat)

    for (const dec of declaratiiDeAdaugat) {
      const exista = declaratii.find(d => d.nume === dec.nume)
      if (!exista) {
        await supabase.from('declaratii').insert({
          ...dec,
          firma_client_id: firmaId,
          luna: LUNI[lunaSelectata],
          an: anSelectat,
          depusa: false
        })
      }
    }

    setMesaj('Declarații generate automat!')
    await incarcaDeclaratii()
  }

  async function toggleDeclaratie(id: string, depusa: boolean) {
    await supabase.from('declaratii').update({
      depusa: !depusa,
      depusa_de: !depusa ? userId : null,
      depusa_la: !depusa ? new Date().toISOString() : null
    }).eq('id', id)
    await incarcaDeclaratii()
  }

  async function adaugaDeclaratieManual() {
    if (!numeDeclaratie) return

    const termenModificat = termenDeclaratie !== 25
    if (termenModificat && !justificareDeclaratie) {
      setMesaj('Adaugă o justificare pentru modificarea termenului.')
      return
    }

    await supabase.from('declaratii').insert({
      firma_client_id: firmaId,
      nume: numeDeclaratie,
      descriere: descriereDeclaratie,
      luna: LUNI[lunaSelectata],
      an: anSelectat,
      termen_actual: termenDeclaratie,
      termen_standard: 25,
      termen_modificat: termenModificat,
      justificare_modificare: justificareDeclaratie,
      generata_automat: false,
      modificata: false,
      depusa: false,
      frecventa: 'lunar'
    })

    setNumeDeclaratie('')
    setDescriereDeclaratie('')
    setTermenDeclaratie(25)
    setJustificareDeclaratie('')
    setShowAdaugaDeclaratie(false)
    await incarcaDeclaratii()
  }

  async function stergeDeclaratie(id: string, generataAutomat: boolean) {
    if (generataAutomat) {
      const justificare = prompt('Această declarație a fost generată automat. Adaugă o justificare pentru ștergere:')
      if (!justificare) return
    }
    await supabase.from('declaratii').delete().eq('id', id)
    await incarcaDeclaratii()
  }

  async function adaugaFolderLunar() {
    const numeLuna = `${LUNI[lunaSelectata]} ${anSelectat}`
    const exista = foldere.find(f => f.nume === numeLuna)
    if (exista) {
      setFolderSelectat(exista)
      return
    }
    await supabase.from('foldere').insert({
      firma_client_id: firmaId,
      nume: numeLuna,
      tip: 'lunar',
      luna: LUNI[lunaSelectata],
      an: anSelectat,
      creat_de: userId
    })
    await incarcaDate()
  }

  async function uploadDocumentFinal(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !folderSelectat) return
    setUploading(true)
    const numeFisier = `${firmaId}/${folderSelectat.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documente').upload(numeFisier, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documente').getPublicUrl(numeFisier)
      await supabase.from('documente').insert({
        folder_id: folderSelectat.id,
        firma_client_id: firmaId,
        nume_fisier: file.name,
        url_fisier: publicUrl,
        tip: 'final',
        status: 'finalizat',
        uploaded_by: userId
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

  async function schimbaStatusLucru(status: string) {
    if (statusLucru) {
      await supabase.from('status_lucru').update({ status, updated_at: new Date().toISOString() }).eq('id', statusLucru.id)
    } else {
      await supabase.from('status_lucru').insert({
        firma_client_id: firmaId,
        contabil_id: userId,
        luna: LUNI[lunaSelectata],
        an: anSelectat,
        status
      })
    }
    await incarcaStatusLucru()
  }

  async function uploadOp(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const numeFisier = `opuri/${firmaId}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documente').upload(numeFisier, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documente').getPublicUrl(numeFisier)
      await supabase.from('opuri').insert({
        firma_client_id: firmaId,
        nume_fisier: file.name,
        url_fisier: publicUrl,
        suma: sumaOp,
        descriere: descriereOp,
        uploaded_by: userId
      })
      setMesaj('OP încărcat!')
      setSumaOp('')
      setDescriereOp('')
      setShowAdaugaOp(false)
      const { data } = await supabase.from('opuri').select('*').eq('firma_client_id', firmaId).order('created_at', { ascending: false })
      setOpuri(data || [])
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
            <button onClick={() => router.back()}
              className="text-indigo-600 text-sm hover:underline mb-1 block">
              ← Înapoi
            </button>
            <h1 className="text-xl font-bold text-gray-800">{firma?.nume}</h1>
            {firma?.cui && <p className="text-sm text-gray-500">CUI: {firma.cui}</p>}
          </div>
          <div className="flex items-center gap-3">
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {mesaj && (
          <div className="bg-green-50 text-green-700 rounded-xl p-3 mb-4 text-sm">{mesaj}</div>
        )}

        {/* Selector luna/an */}
        <div className="flex gap-3 mb-4">
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab('profil_fiscal')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'profil_fiscal' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            🏛️ Profil fiscal
          </button>
          <button onClick={() => setTab('declaratii')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'declaratii' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            📋 Declarații ({declaratii.length})
          </button>
          <button onClick={() => setTab('documente')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'documente' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            📄 Documente
          </button>
          <button onClick={() => setTab('opuri')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'opuri' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
            💳 OP-uri ({opuri.length})
          </button>
        </div>

        {/* Tab Profil Fiscal */}
        {tab === 'profil_fiscal' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-800 text-lg">Profil fiscal — {firma?.nume}</h2>
              <button onClick={() => setEditProfilFiscal(!editProfilFiscal)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                {editProfilFiscal ? 'Anulează' : profilFiscal ? '✏️ Modifică' : '+ Completează'}
              </button>
            </div>

            {!editProfilFiscal && profilFiscal && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Tip societate</p>
                  <p className="font-bold text-gray-800 uppercase">{profilFiscal.tip_societate}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Sistem impozitare</p>
                  <p className="font-bold text-gray-800">
                    {profilFiscal.sistem_impozitare === 'micro' ? 'Microîntreprindere' : 'Impozit pe profit'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">TVA</p>
                  <p className="font-bold text-gray-800">
                    {profilFiscal.tva === 'neplatitor' ? 'Neplatitor' :
                     profilFiscal.tva === 'lunar' ? 'Platitor lunar' : 'Platitor trimestrial'}
                  </p>
                </div>
                <div className={`rounded-xl p-4 ${profilFiscal.are_salariati ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">Salariați</p>
                  <p className="font-bold text-gray-800">{profilFiscal.are_salariati ? '✅ Da' : '❌ Nu'}</p>
                </div>
                <div className={`rounded-xl p-4 ${profilFiscal.cif_intracomunitar ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">CIF intracomunitar</p>
                  <p className="font-bold text-gray-800">{profilFiscal.cif_intracomunitar ? '✅ Da' : '❌ Nu'}</p>
                </div>
                <div className={`rounded-xl p-4 ${profilFiscal.achizitii_intracomunitare ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">Achiziții intracomunitare</p>
                  <p className="font-bold text-gray-800">{profilFiscal.achizitii_intracomunitare ? '✅ Da' : '❌ Nu'}</p>
                </div>
                <div className={`rounded-xl p-4 ${profilFiscal.vanzari_intracomunitare ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">Vânzări intracomunitare</p>
                  <p className="font-bold text-gray-800">{profilFiscal.vanzari_intracomunitare ? '✅ Da' : '❌ Nu'}</p>
                </div>
              </div>
            )}

            {!editProfilFiscal && !profilFiscal && (
              <div className="text-center py-8">
                <span className="text-5xl">🏛️</span>
                <p className="text-gray-500 mt-4">Profilul fiscal nu a fost completat încă.</p>
                <p className="text-gray-400 text-sm mt-1">Completează profilul pentru a genera automat declarațiile.</p>
              </div>
            )}

            {editProfilFiscal && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tip societate</label>
                    <select value={tipSocietate} onChange={e => setTipSocietate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500">
                      <option value="srl">SRL</option>
                      <option value="sa">SA</option>
                      <option value="ong">ONG</option>
                      <option value="pfa">PFA</option>
                      <option value="altul">Altul</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sistem impozitare</label>
                    <select value={sistemImpozitare} onChange={e => setSistemImpozitare(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500">
                      <option value="micro">Microîntreprindere</option>
                      <option value="profit">Impozit pe profit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">TVA</label>
                    <select value={tva} onChange={e => setTva(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500">
                      <option value="neplatitor">Neplatitor TVA</option>
                      <option value="lunar">Platitor lunar</option>
                      <option value="trimestrial">Platitor trimestrial</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={areSalariati} onChange={e => setAreSalariati(e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-600" />
                    <span className="font-semibold text-gray-800">Are salariați</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={cifIntracomunitar} onChange={e => setCifIntracomunitar(e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-600" />
                    <span className="font-semibold text-gray-800">Are CIF intracomunitar</span>
                  </label>
                  {cifIntracomunitar && (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer ml-8">
                        <input type="checkbox" checked={achizitiiIntracomunitare} onChange={e => setAchizitiiIntracomunitare(e.target.checked)}
                          className="w-5 h-5 rounded accent-indigo-600" />
                        <span className="font-semibold text-gray-800">Achiziții intracomunitare</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer ml-8">
                        <input type="checkbox" checked={vanzariIntracomunitare} onChange={e => setVanzariIntracomunitare(e.target.checked)}
                          className="w-5 h-5 rounded accent-indigo-600" />
                        <span className="font-semibold text-gray-800">Vânzări intracomunitare</span>
                      </label>
                    </>
                  )}
                </div>

                <button onClick={salveazaProfilFiscal}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                  Salvează profilul fiscal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Declaratii */}
        {tab === 'declaratii' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-gray-800">
                Declarații {LUNI[lunaSelectata]} {anSelectat}
              </h3>
              <div className="flex gap-2">
                <button onClick={genereazaDeclaratiiAutomat}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                  ⚡ Generează automat
                </button>
                <button onClick={() => setShowAdaugaDeclaratie(!showAdaugaDeclaratie)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                  + Adaugă manual
                </button>
              </div>
            </div>

            {showAdaugaDeclaratie && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Termen (standard: 25)
                    </label>
                    <input type="number" value={termenDeclaratie} onChange={e => setTermenDeclaratie(Number(e.target.value))}
                      min={1} max={31}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  {termenDeclaratie !== 25 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Justificare modificare termen *
                      </label>
                      <input value={justificareDeclaratie} onChange={e => setJustificareDeclaratie(e.target.value)}
                        placeholder="Motiv modificare termen..."
                        className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:border-red-500" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={adaugaDeclaratieManual}
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
                <p className="text-gray-400 text-xs mt-1">Apasă "Generează automat" sau adaugă manual.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Declarație</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Descriere</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Termen</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Frecvență</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {declaratii.map(dec => (
                      <tr key={dec.id} className={`border-b border-gray-50 ${dec.depusa ? 'bg-green-50' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{dec.nume}</span>
                            {dec.generata_automat && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs">auto</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{dec.descriere}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold text-gray-800">{dec.termen_actual || 25}</span>
                            {dec.termen_modificat && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-xs" title={dec.justificare_modificare}>
                                ⚠️ modificat
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-500 capitalize">{dec.frecventa}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dec.depusa ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {dec.depusa ? '✅ Depusă' : '⏳ Nedepusă'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button onClick={() => toggleDeclaratie(dec.id, dec.depusa)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${dec.depusa ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                              {dec.depusa ? 'Anulează' : 'Marchează depusă'}
                            </button>
                            <button onClick={() => stergeDeclaratie(dec.id, dec.generata_automat)}
                              className="px-3 py-1 rounded-full text-xs bg-red-50 text-red-600 hover:bg-red-100 transition">
                              Șterge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Documente */}
        {tab === 'documente' && (
          <div className="flex gap-4">
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
      </div>
    </main>
  )
}