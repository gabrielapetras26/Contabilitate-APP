'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const LUNI = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

const JUDETE = ['Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
  'Brașov', 'Brăila', 'București', 'Buzău', 'Caraș-Severin', 'Călărași', 'Cluj',
  'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj',
  'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți',
  'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj', 'Sibiu', 'Suceava',
  'Teleorman', 'Timiș', 'Tulcea', 'Vaslui', 'Vâlcea', 'Vrancea']

function getTrimestru(luna: number): number {
  if (luna <= 2) return 1
  if (luna <= 5) return 2
  if (luna <= 8) return 3
  return 4
}

function esteUltimaLunaTrimestru(luna: number): boolean {
  return [2, 5, 8, 11].includes(luna)
}

function genereazaDeclaratiiDinProfil(profil: any, luna: number, an: number) {
  const declaratii: any[] = []
  const trimestru = getTrimestru(luna)
  const ultimaLunaTrimestru = esteUltimaLunaTrimestru(luna)
  const esteDecembrie = luna === 11

  if (profil.sistem_impozitare === 'micro' || profil.sistem_impozitare === 'profit') {
    if (ultimaLunaTrimestru) {
      declaratii.push({
        nume: 'D100',
        descriere: `Impozit ${profil.sistem_impozitare === 'micro' ? 'microîntreprindere' : 'pe profit'} — T${trimestru}`,
        frecventa: 'trimestrial', trimestru, termen_actual: 25, generata_automat: true
      })
    }
  }

  if (profil.sistem_impozitare === 'profit' && esteDecembrie) {
    declaratii.push({
      nume: 'D101', descriere: 'Impozit pe profit anual',
      frecventa: 'anual', trimestru: 4, termen_actual: 25, generata_automat: true
    })
  }

  if (profil.are_salariati) {
    declaratii.push({
      nume: 'D112', descriere: 'Declarație salarii și contribuții sociale',
      frecventa: 'lunar', termen_actual: 25, generata_automat: true
    })
  }

  if (profil.tva === 'lunar') {
    declaratii.push({
      nume: 'D300', descriere: 'Decontul de TVA lunar',
      frecventa: 'lunar', termen_actual: 25, generata_automat: true
    })
    declaratii.push({
      nume: 'D394', descriere: 'Declarație informativă TVA lunar',
      frecventa: 'lunar', termen_actual: 25, generata_automat: true
    })
  }

  if (profil.tva === 'trimestrial' && ultimaLunaTrimestru) {
    declaratii.push({
      nume: 'D300', descriere: `Decontul de TVA — T${trimestru}`,
      frecventa: 'trimestrial', trimestru, termen_actual: 25, generata_automat: true
    })
    declaratii.push({
      nume: 'D394', descriere: `Declarație informativă TVA — T${trimestru}`,
      frecventa: 'trimestrial', trimestru, termen_actual: 25, generata_automat: true
    })
  }

  if (profil.tva === 'neplatitor' && profil.cif_intracomunitar && profil.achizitii_intracomunitare) {
    declaratii.push({
      nume: 'D301', descriere: 'Declarație achiziții intracomunitare — neplatitor TVA',
      frecventa: 'lunar', termen_actual: 25, generata_automat: true
    })
  }

  if (profil.cif_intracomunitar && (profil.achizitii_intracomunitare || profil.vanzari_intracomunitare)) {
    declaratii.push({
      nume: 'D390', descriere: 'Declarație recapitulativă achiziții/vânzări intracomunitare',
      frecventa: 'lunar', termen_actual: 25, generata_automat: true
    })
  }

  if (esteDecembrie) {
    declaratii.push({
      nume: 'Bilanț anual', descriere: 'Situații financiare anuale',
      frecventa: 'anual', termen_actual: 25, generata_automat: true
    })
  }

  return declaratii
}

function genereazaOpuriStatDinProfil(profil: any, luna: number, an: number) {
  const opuri: any[] = []
  const trimestru = getTrimestru(luna)
  const ultimaLunaTrimestru = esteUltimaLunaTrimestru(luna)

  if (profil.are_salariati) {
    opuri.push({
      nume: 'CAS angajator', descriere: 'Contribuție asigurări sociale angajator',
      frecventa: 'lunar', necesar: true, generata_automat: true
    })
    opuri.push({
      nume: 'CASS angajator', descriere: 'Contribuție asigurări sănătate angajator',
      frecventa: 'lunar', necesar: true, generata_automat: true
    })
    opuri.push({
      nume: 'CAM', descriere: 'Contribuție asiguratorie pentru muncă',
      frecventa: 'lunar', necesar: true, generata_automat: true
    })
    opuri.push({
      nume: 'Impozit salarii', descriere: 'Impozit pe venit din salarii',
      frecventa: 'lunar', necesar: true, generata_automat: true
    })
  }

  if (profil.tva === 'lunar') {
    opuri.push({
      nume: 'TVA de plată', descriere: 'TVA de plată lunar',
      frecventa: 'lunar', necesar: true, generata_automat: true
    })
  }

  if (profil.tva === 'trimestrial' && ultimaLunaTrimestru) {
    opuri.push({
      nume: 'TVA de plată', descriere: `TVA de plată — T${trimestru}`,
      frecventa: 'trimestrial', trimestru, necesar: true, generata_automat: true
    })
  }

  if (ultimaLunaTrimestru) {
    opuri.push({
      nume: profil.sistem_impozitare === 'micro' ? 'Impozit micro' : 'Impozit profit',
      descriere: `Impozit ${profil.sistem_impozitare === 'micro' ? 'microîntreprindere' : 'pe profit'} — T${trimestru}`,
      frecventa: 'trimestrial', trimestru, necesar: true, generata_automat: true
    })
  }

  return opuri
}

export default function FirmaContabil() {
  const router = useRouter()
  const params = useParams()
  const firmaId = params.firmaId as string

  const [firma, setFirma] = useState<any>(null)
  const [profilFiscal, setProfilFiscal] = useState<any>(null)
  const [declaratii, setDeclaratii] = useState<any[]>([])
  const [opuriStat, setOpuriStat] = useState<any[]>([])
  const [foldere, setFoldere] = useState<any[]>([])
  const [folderSelectat, setFolderSelectat] = useState<any>(null)
  const [documente, setDocumente] = useState<any[]>([])
  const [opuri, setOpuri] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'profil_fiscal' | 'declaratii' | 'opuri_stat' | 'documente' | 'opuri'>('profil_fiscal')
  const [lunaSelectata, setLunaSelectata] = useState(new Date().getMonth())
  const [anSelectat, setAnSelectat] = useState(new Date().getFullYear())
  const [statusLucru, setStatusLucru] = useState<any>(null)
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
  const [judet, setJudet] = useState('')
  const [localitate, setLocalitate] = useState('')
  const [adresa, setAdresa] = useState('')

  // Declaratii
  const [showAdaugaDeclaratie, setShowAdaugaDeclaratie] = useState(false)
  const [numeDeclaratie, setNumeDeclaratie] = useState('')
  const [descriereDeclaratie, setDescriereDeclaratie] = useState('')
  const [termenDeclaratie, setTermenDeclaratie] = useState(25)
  const [justificareDeclaratie, setJustificareDeclaratie] = useState('')

  // OP-uri stat
  const [showAdaugaOpStat, setShowAdaugaOpStat] = useState(false)
  const [numeOpStat, setNumeOpStat] = useState('')
  const [descriereOpStat, setDescriereOpStat] = useState('')
  const [sumaOpStat, setSumaOpStat] = useState('')

  // OP-uri documente
  const [showAdaugaOp, setShowAdaugaOp] = useState(false)
  const [sumaOp, setSumaOp] = useState('')
  const [descriereOp, setDescriereOp] = useState('')

  useEffect(() => { incarcaDate() }, [])

  useEffect(() => {
    if (firma) {
      incarcaDeclaratii()
      incarcaOpuriStat()
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
      .from('firme_cliente').select('*').eq('id', firmaId).single()
    setFirma(firmaData)

    const { data: profilData } = await supabase
      .from('profil_fiscal').select('*').eq('firma_client_id', firmaId).single()

    if (profilData) {
      setProfilFiscal(profilData)
      setTipSocietate(profilData.tip_societate || 'srl')
      setSistemImpozitare(profilData.sistem_impozitare || 'micro')
      setAreSalariati(profilData.are_salariati || false)
      setTva(profilData.tva || 'neplatitor')
      setCifIntracomunitar(profilData.cif_intracomunitar || false)
      setAchizitiiIntracomunitare(profilData.achizitii_intracomunitare || false)
      setVanzariIntracomunitare(profilData.vanzari_intracomunitare || false)
      setJudet(profilData.judet || '')
      setLocalitate(profilData.localitate || '')
      setAdresa(profilData.adresa || '')
    }

    const { data: foldereData } = await supabase
      .from('foldere').select('*').eq('firma_client_id', firmaId).order('created_at', { ascending: true })
    setFoldere(foldereData || [])
    if (foldereData && foldereData.length > 0) setFolderSelectat(foldereData[0])

    const { data: opuriData } = await supabase
      .from('opuri').select('*').eq('firma_client_id', firmaId).order('created_at', { ascending: false })
    setOpuri(opuriData || [])

    setLoading(false)
  }

  async function incarcaDeclaratii() {
    const { data } = await supabase
      .from('declaratii').select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .order('created_at', { ascending: true })
    setDeclaratii(data || [])
  }

  async function incarcaOpuriStat() {
    const { data } = await supabase
      .from('opuri_stat').select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .order('created_at', { ascending: true })
    setOpuriStat(data || [])
  }

  async function incarcaStatusLucru() {
    const { data } = await supabase
      .from('status_lucru').select('*')
      .eq('firma_client_id', firmaId)
      .eq('luna', LUNI[lunaSelectata])
      .eq('an', anSelectat)
      .single()
    setStatusLucru(data)
  }

  async function incarcaDocumente(folderId: string) {
    const { data } = await supabase
      .from('documente').select('*').eq('folder_id', folderId).order('created_at', { ascending: false })
    setDocumente(data || [])
  }

  async function salveazaProfilFiscal() {
    const profilNou = {
      firma_client_id: firmaId,
      tip_societate: tipSocietate,
      sistem_impozitare: sistemImpozitare,
      are_salariati: areSalariati,
      tva, cif_intracomunitar: cifIntracomunitar,
      achizitii_intracomunitare: achizitiiIntracomunitare,
      vanzari_intracomunitare: vanzariIntracomunitare,
      judet, localitate, adresa,
      updated_at: new Date().toISOString()
    }

    let profilSalvat
    if (profilFiscal) {
      const { data } = await supabase.from('profil_fiscal').update(profilNou).eq('id', profilFiscal.id).select().single()
      profilSalvat = data
    } else {
      const { data } = await supabase.from('profil_fiscal').insert(profilNou).select().single()
      profilSalvat = data
    }

    if (profilSalvat) {
      // Genereaza automat declaratii pentru luna curenta
      const declaratiiDeAdaugat = genereazaDeclaratiiDinProfil(profilSalvat, lunaSelectata, anSelectat)
      for (const dec of declaratiiDeAdaugat) {
        const { data: existing } = await supabase.from('declaratii').select('id')
          .eq('firma_client_id', firmaId).eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat).eq('nume', dec.nume).single()
        if (!existing) {
          await supabase.from('declaratii').insert({
            ...dec, firma_client_id: firmaId,
            luna: LUNI[lunaSelectata], an: anSelectat, depusa: false
          })
        }
      }

      // Genereaza automat OP-uri stat pentru luna curenta
      const opuriDeAdaugat = genereazaOpuriStatDinProfil(profilSalvat, lunaSelectata, anSelectat)
      for (const op of opuriDeAdaugat) {
        const { data: existing } = await supabase.from('opuri_stat').select('id')
          .eq('firma_client_id', firmaId).eq('luna', LUNI[lunaSelectata]).eq('an', anSelectat).eq('nume', op.nume).single()
        if (!existing) {
          await supabase.from('opuri_stat').insert({
            ...op, firma_client_id: firmaId,
            luna: LUNI[lunaSelectata], an: anSelectat
          })
        }
      }
    }

    setMesaj('Profil fiscal salvat! Declarații și OP-uri generate automat.')
    setEditProfilFiscal(false)
    await incarcaDate()
    await incarcaDeclaratii()
    await incarcaOpuriStat()
  }

  async function toggleDeclaratie(id: string, depusa: boolean) {
    await supabase.from('declaratii').update({
      depusa: !depusa,
      depusa_de: !depusa ? userId : null,
      depusa_la: !depusa ? new Date().toISOString() : null
    }).eq('id', id)
    await incarcaDeclaratii()
  }

  async function stergeDeclaratie(id: string, generataAutomat: boolean) {
    if (generataAutomat) {
      const justificare = prompt('Declarație generată automat. Adaugă justificare pentru ștergere:')
      if (!justificare) return
    }
    await supabase.from('declaratii').delete().eq('id', id)
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
      firma_client_id: firmaId, nume: numeDeclaratie,
      descriere: descriereDeclaratie, luna: LUNI[lunaSelectata], an: anSelectat,
      termen_actual: termenDeclaratie, termen_standard: 25,
      termen_modificat: termenModificat, justificare_modificare: justificareDeclaratie,
      generata_automat: false, depusa: false, frecventa: 'lunar'
    })
    setNumeDeclaratie(''); setDescriereDeclaratie(''); setTermenDeclaratie(25)
    setJustificareDeclaratie(''); setShowAdaugaDeclaratie(false)
    await incarcaDeclaratii()
  }

  async function toggleOpStat(id: string, achitat: boolean) {
    await supabase.from('opuri_stat').update({
      achitat: !achitat,
      achitat_de: !achitat ? userId : null,
      achitat_la: !achitat ? new Date().toISOString() : null
    }).eq('id', id)
    await incarcaOpuriStat()
  }

  async function toggleNecesarOpStat(id: string, necesar: boolean) {
    if (necesar) {
      const motiv = prompt('Motiv pentru care OP-ul nu este necesar:')
      if (!motiv) return
      await supabase.from('opuri_stat').update({ necesar: false, motiv_nenecesar: motiv }).eq('id', id)
    } else {
      await supabase.from('opuri_stat').update({ necesar: true, motiv_nenecesar: null }).eq('id', id)
    }
    await incarcaOpuriStat()
  }

  async function adaugaOpStat() {
    if (!numeOpStat) return
    await supabase.from('opuri_stat').insert({
      firma_client_id: firmaId, nume: numeOpStat,
      descriere: descriereOpStat, suma: sumaOpStat,
      luna: LUNI[lunaSelectata], an: anSelectat,
      frecventa: 'lunar', necesar: true, generata_automat: false
    })
    setNumeOpStat(''); setDescriereOpStat(''); setSumaOpStat('')
    setShowAdaugaOpStat(false)
    await incarcaOpuriStat()
  }

  async function schimbaStatusLucru(status: string) {
    if (statusLucru) {
      await supabase.from('status_lucru').update({ status, updated_at: new Date().toISOString() }).eq('id', statusLucru.id)
    } else {
      await supabase.from('status_lucru').insert({
        firma_client_id: firmaId, contabil_id: userId,
        luna: LUNI[lunaSelectata], an: anSelectat, status
      })
    }
    await incarcaStatusLucru()
  }

  async function adaugaFolderLunar() {
    const numeLuna = `${LUNI[lunaSelectata]} ${anSelectat}`
    const exista = foldere.find(f => f.nume === numeLuna)
    if (exista) { setFolderSelectat(exista); return }
    await supabase.from('foldere').insert({
      firma_client_id: firmaId, nume: numeLuna,
      tip: 'lunar', luna: LUNI[lunaSelectata], an: anSelectat, creat_de: userId
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
        folder_id: folderSelectat.id, firma_client_id: firmaId,
        nume_fisier: file.name, url_fisier: publicUrl,
        tip: 'final', status: 'finalizat', uploaded_by: userId
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

  async function uploadOp(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const numeFisier = `opuri/${firmaId}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documente').upload(numeFisier, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documente').getPublicUrl(numeFisier)
      await supabase.from('opuri').insert({
        firma_client_id: firmaId, nume_fisier: file.name,
        url_fisier: publicUrl, suma: sumaOp, descriere: descriereOp, uploaded_by: userId
      })
      setMesaj('OP încărcat!')
      setSumaOp(''); setDescriereOp(''); setShowAdaugaOp(false)
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-3">
          <div>
            <button onClick={() => router.back()}
              className="text-indigo-600 text-sm hover:underline mb-1 block">← Înapoi</button>
            <h1 className="text-xl font-bold text-gray-800">{firma?.nume}</h1>
            {firma?.cui && <p className="text-sm text-gray-500">CUI: {firma.cui}</p>}
            {profilFiscal?.judet && <p className="text-xs text-gray-400">{profilFiscal.localitate}, {profilFiscal.judet}</p>}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'profil_fiscal', label: '🏛️ Profil fiscal' },
            { key: 'declaratii', label: `📋 Declarații (${declaratii.length})` },
            { key: 'opuri_stat', label: `💰 OP-uri stat (${opuriStat.length})` },
            { key: 'documente', label: '📄 Documente' },
            { key: 'opuri', label: `💳 OP-uri (${opuri.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-indigo-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Profil Fiscal */}
        {tab === 'profil_fiscal' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-800 text-lg">Profil fiscal</h2>
              <button onClick={() => setEditProfilFiscal(!editProfilFiscal)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                {editProfilFiscal ? 'Anulează' : profilFiscal ? '✏️ Modifică' : '+ Completează'}
              </button>
            </div>

            {!editProfilFiscal && profilFiscal && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Tip societate', value: profilFiscal.tip_societate?.toUpperCase() },
                  { label: 'Sistem impozitare', value: profilFiscal.sistem_impozitare === 'micro' ? 'Microîntreprindere' : 'Impozit pe profit' },
                  { label: 'TVA', value: profilFiscal.tva === 'neplatitor' ? 'Neplatitor' : profilFiscal.tva === 'lunar' ? 'Platitor lunar' : 'Platitor trimestrial' },
                  { label: 'Salariați', value: profilFiscal.are_salariati ? '✅ Da' : '❌ Nu' },
                  { label: 'CIF intracomunitar', value: profilFiscal.cif_intracomunitar ? '✅ Da' : '❌ Nu' },
                  { label: 'Achiziții intracomunitare', value: profilFiscal.achizitii_intracomunitare ? '✅ Da' : '❌ Nu' },
                  { label: 'Vânzări intracomunitare', value: profilFiscal.vanzari_intracomunitare ? '✅ Da' : '❌ Nu' },
                  { label: 'Județ', value: profilFiscal.judet || '-' },
                  { label: 'Localitate', value: profilFiscal.localitate || '-' },
                  { label: 'Adresă', value: profilFiscal.adresa || '-' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className="font-bold text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {!editProfilFiscal && !profilFiscal && (
              <div className="text-center py-8">
                <span className="text-5xl">🏛️</span>
                <p className="text-gray-500 mt-4">Profilul fiscal nu a fost completat încă.</p>
                <p className="text-gray-400 text-sm mt-1">Completează profilul pentru a genera automat declarațiile și OP-urile.</p>
              </div>
            )}

            {editProfilFiscal && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Județ</label>
                    <select value={judet} onChange={e => setJudet(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500">
                      <option value="">Selectează județul...</option>
                      {JUDETE.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Localitate</label>
                    <input value={localitate} onChange={e => setLocalitate(e.target.value)}
                      placeholder="Ex: Cluj-Napoca"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Adresă</label>
                    <input value={adresa} onChange={e => setAdresa(e.target.value)}
                      placeholder="Str. Exemplu nr. 1"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { val: areSalariati, set: setAreSalariati, label: 'Are salariați' },
                    { val: cifIntracomunitar, set: setCifIntracomunitar, label: 'Are CIF intracomunitar' },
                  ].map((item, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)}
                        className="w-5 h-5 rounded accent-indigo-600" />
                      <span className="font-semibold text-gray-800">{item.label}</span>
                    </label>
                  ))}
                  {cifIntracomunitar && (
                    <div className="ml-8 space-y-3">
                      {[
                        { val: achizitiiIntracomunitare, set: setAchizitiiIntracomunitare, label: 'Achiziții intracomunitare' },
                        { val: vanzariIntracomunitare, set: setVanzariIntracomunitare, label: 'Vânzări intracomunitare' },
                      ].map((item, i) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)}
                            className="w-5 h-5 rounded accent-indigo-600" />
                          <span className="font-semibold text-gray-800">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={salveazaProfilFiscal}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                  Salvează profilul fiscal + generează declarații și OP-uri automat
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Declaratii */}
        {tab === 'declaratii' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-gray-800">Declarații {LUNI[lunaSelectata]} {anSelectat}</h3>
              <button onClick={() => setShowAdaugaDeclaratie(!showAdaugaDeclaratie)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                + Adaugă manual
              </button>
            </div>

            {showAdaugaDeclaratie && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tip declarație *</label>
                    <input value={numeDeclaratie} onChange={e => setNumeDeclaratie(e.target.value)}
                      placeholder="Ex: D700"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Descriere</label>
                    <input value={descriereDeclaratie} onChange={e => setDescriereDeclaratie(e.target.value)}
                      placeholder="Descriere declarație"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Termen (standard: 25)</label>
                    <input type="number" value={termenDeclaratie} onChange={e => setTermenDeclaratie(Number(e.target.value))}
                      min={1} max={31}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  {termenDeclaratie !== 25 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Justificare modificare termen *</label>
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
                <p className="text-gray-400 text-xs mt-1">Completează profilul fiscal pentru a genera automat.</p>
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
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-xs" title={dec.justificare_modificare}>⚠️</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 capitalize">{dec.frecventa}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dec.depusa ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {dec.depusa ? '✅ Depusă' : '⏳ Nedepusă'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button onClick={() => toggleDeclaratie(dec.id, dec.depusa)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${dec.depusa ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                              {dec.depusa ? 'Anulează' : 'Depusă'}
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

        {/* Tab OP-uri Stat */}
        {tab === 'opuri_stat' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-gray-800">OP-uri către stat {LUNI[lunaSelectata]} {anSelectat}</h3>
              <button onClick={() => setShowAdaugaOpStat(!showAdaugaOpStat)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                + Adaugă manual
              </button>
            </div>

            {showAdaugaOpStat && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tip OP *</label>
                    <input value={numeOpStat} onChange={e => setNumeOpStat(e.target.value)}
                      placeholder="Ex: Impozit clădire"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Descriere</label>
                    <input value={descriereOpStat} onChange={e => setDescriereOpStat(e.target.value)}
                      placeholder="Descriere"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sumă</label>
                    <input value={sumaOpStat} onChange={e => setSumaOpStat(e.target.value)}
                      placeholder="Ex: 1500 RON"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={adaugaOpStat}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                    Salvează
                  </button>
                  <button onClick={() => setShowAdaugaOpStat(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                    Anulează
                  </button>
                </div>
              </div>
            )}

            {opuriStat.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl">💰</span>
                <p className="text-gray-400 mt-3 text-sm">Nu există OP-uri pentru această perioadă.</p>
                <p className="text-gray-400 text-xs mt-1">Completează profilul fiscal pentru a genera automat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Tip</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Descriere</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Sumă</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Necesar</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opuriStat.map(op => (
                      <tr key={op.id} className={`border-b border-gray-50 ${!op.necesar ? 'opacity-50' : op.achitat ? 'bg-green-50' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{op.nume}</span>
                            {op.generata_automat && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs">auto</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{op.descriere}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-800">{op.suma || '-'}</td>
                        <td className="py-3 px-4">
                          {op.necesar ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">✅ Necesar</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500" title={op.motiv_nenecesar}>❌ Nu e necesar</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {op.necesar && (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${op.achitat ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {op.achitat ? '✅ Achitat' : '⏳ Neachitat'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 flex-wrap">
                            {op.necesar && (
                              <button onClick={() => toggleOpStat(op.id, op.achitat)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${op.achitat ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                {op.achitat ? 'Anulează' : 'Achitat'}
                              </button>
                            )}
                            <button onClick={() => toggleNecesarOpStat(op.id, op.necesar)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${op.necesar ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                              {op.necesar ? 'Nu e necesar' : 'E necesar'}
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
                <button onClick={adaugaFolderLunar} className="text-xs text-indigo-600 hover:underline">+ Lunar</button>
              </div>
              <div className="space-y-1">
                {foldere.map(folder => (
                  <button key={folder.id} onClick={() => setFolderSelectat(folder)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition text-xs ${folderSelectat?.id === folder.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 hover:bg-indigo-50'}`}>
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
                        <p className="font-semibold text-indigo-600 text-sm">{uploading ? 'Se încarcă...' : 'Încarcă document final'}</p>
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
                                {doc.status === 'nou' && <span className="px-2 py-0.5 bg-amber-400 text-white rounded-full text-xs font-bold">NOU</span>}
                              </div>
                              <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('ro-RO')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
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

        {/* Tab OP-uri documente */}
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
                  <p className="font-semibold text-indigo-600 text-sm">{uploading ? 'Se încarcă...' : 'Selectează fișierul OP'}</p>
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