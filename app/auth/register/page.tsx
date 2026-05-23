'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [pas, setPas] = useState(1)
  const [nume, setNume] = useState('')
  const [email, setEmail] = useState('')
  const [parola, setParola] = useState('')
  const [tipFirma, setTipFirma] = useState<'client' | 'contabilitate' | ''>('')
  const [numeFirma, setNumeFirma] = useState('')
  const [cuiFirma, setCuiFirma] = useState('')
  const [emailFirma, setEmailFirma] = useState('')
  const [telefonFirma, setTelefonFirma] = useState('')
  const [modFolosire, setModFolosire] = useState<'cu_firma_conta' | 'independent' | ''>('')
  const [documentCeccar, setDocumentCeccar] = useState<File | null>(null)
  const [eroare, setEroare] = useState('')
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)

  async function handleRegister() {
    setLoading(true)
    setEroare('')

    if (!nume || !email || !parola) {
      setEroare('Completează toate câmpurile.')
      setLoading(false)
      return
    }

    if (parola.length < 6) {
      setEroare('Parola trebuie să aibă minim 6 caractere.')
      setLoading(false)
      return
    }

    if (!tipFirma) {
      setEroare('Alege tipul firmei.')
      setLoading(false)
      return
    }

   if (!numeFirma || !cuiFirma || !telefonFirma) {
  setEroare('Denumirea firmei, CUI-ul și telefonul sunt obligatorii.')
  setLoading(false)
  return
}

    if (tipFirma === 'contabilitate' && !documentCeccar) {
      setEroare('Documentul CECCAR este obligatoriu pentru firmele de contabilitate.')
      setLoading(false)
      return
    }

    if (tipFirma === 'client' && !modFolosire) {
      setEroare('Specifică modul de folosire al platformei.')
      setLoading(false)
      return
    }

    // Cream contul
    const { data, error } = await supabase.auth.signUp({
      email,
      password: parola,
      options: { data: { nume } }
    })

    if (error) {
      setEroare('Eroare: ' + error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setEroare('Eroare la crearea contului.')
      setLoading(false)
      return
    }

    // Cream profilul
    await supabase.from('profiluri').insert({
      id: data.user.id,
      nume,
      email
    })

    if (tipFirma === 'contabilitate') {
      // Upload document CECCAR
      let documentUrl = ''
      if (documentCeccar) {
        const numeFisier = `ceccar/${data.user.id}_${documentCeccar.name}`
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

      // Cream firma de contabilitate
      const { data: firma } = await supabase
        .from('firme_contabilitate')
        .insert({
          nume: numeFirma,
          cui: cuiFirma,
          email: emailFirma,
          telefon: telefonFirma,
          document_ceccar_url: documentUrl,
          admin_id: data.user.id,
          verificat: false
        })
        .select()
        .single()

      // Adaugam rolurile
      await supabase.from('utilizator_roluri').insert([
        { utilizator_id: data.user.id, rol: 'admin_conta' },
        { utilizator_id: data.user.id, rol: 'contabil' }
      ])

    } else {
      // Cream firma client
      const { data: firma } = await supabase
        .from('firme_cliente')
        .insert({
          nume: numeFirma,
          cui: cuiFirma,
          email: emailFirma,
          telefon: telefonFirma,
          admin_id: data.user.id,
          mod_folosire: modFolosire,
          data_asociere_ceruta: modFolosire === 'cu_firma_conta' ? new Date().toISOString() : null
        })
        .select()
        .single()

      // Adaugam folderul de upload implicit
      if (firma) {
        await supabase.from('foldere').insert({
          firma_client_id: firma.id,
          nume: 'Documente încărcate',
          tip: 'upload',
          creat_de: data.user.id
        })
      }

      // Adaugam rolul
      await supabase.from('utilizator_roluri').insert({
        utilizator_id: data.user.id,
        rol: 'admin_firma_client'
      })
    }

    setSucces(true)
    setLoading(false)
  }

  if (succes) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cont creat!</h2>
          <p className="text-gray-500 mb-2">Verifică emailul pentru a confirma contul.</p>
          {tipFirma === 'contabilitate' && (
            <p className="text-amber-600 text-sm mb-6 bg-amber-50 p-3 rounded-xl">
              ⏳ Contul tău va fi activat după verificarea documentului CECCAR de către echipa noastră.
            </p>
          )}
          {tipFirma === 'client' && modFolosire === 'cu_firma_conta' && (
            <p className="text-amber-600 text-sm mb-6 bg-amber-50 p-3 rounded-xl">
              ⏳ Ai 7 zile să fii adăugat în portofoliul firmei de contabilitate. Altfel va fi necesar un abonament.
            </p>
          )}
          <Link href="/auth/login"
            className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            Mergi la Login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-lg">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Creează cont</h1>
          <p className="text-gray-500 mt-1">Completează datele pentru înregistrare</p>
        </div>

        {/* Indicator pași */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${pas >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          <div className={`h-1 w-12 rounded ${pas >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${pas >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          <div className={`h-1 w-12 rounded ${pas >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${pas >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
        </div>

        {eroare && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {eroare}
          </div>
        )}

        {/* Pas 1 - Date personale */}
        {pas === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 mb-4">Date personale</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nume complet</label>
              <input type="text" value={nume} onChange={e => setNume(e.target.value)}
                placeholder="Ion Popescu"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplu.ro"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Parolă</label>
              <input type="password" value={parola} onChange={e => setParola(e.target.value)}
                placeholder="Minim 6 caractere"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <button onClick={() => {
              if (!nume || !email || !parola) { setEroare('Completează toate câmpurile.'); return }
              if (parola.length < 6) { setEroare('Parola minim 6 caractere.'); return }
              setEroare(''); setPas(2)
            }}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
              Continuă →
            </button>
          </div>
        )}

        {/* Pas 2 - Tip firma */}
        {pas === 2 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 mb-4">Tipul firmei tale</h2>
            <button onClick={() => setTipFirma('client')}
              className={`w-full py-4 px-6 rounded-xl border-2 text-left transition ${tipFirma === 'client' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
              <p className="font-bold text-gray-800">🏢 Firmă client</p>
              <p className="text-sm text-gray-500 mt-1">Încarc documente pentru contabilul meu</p>
            </button>
            <button onClick={() => setTipFirma('contabilitate')}
              className={`w-full py-4 px-6 rounded-xl border-2 text-left transition ${tipFirma === 'contabilitate' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
              <p className="font-bold text-gray-800">🏦 Firmă de contabilitate</p>
              <p className="text-sm text-gray-500 mt-1">Gestionez documentele clienților mei</p>
            </button>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setEroare(''); setPas(1) }}
                className="w-1/3 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                ← Înapoi
              </button>
              <button onClick={() => {
                if (!tipFirma) { setEroare('Alege tipul firmei.'); return }
                setEroare(''); setPas(3)
              }}
                className="w-2/3 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                Continuă →
              </button>
            </div>
          </div>
        )}

        {/* Pas 3 - Date firma */}
        {pas === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 mb-4">
              {tipFirma === 'contabilitate' ? 'Date firmă contabilitate' : 'Date firmă client'}
            </h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Denumire firmă *</label>
              <input type="text" value={numeFirma} onChange={e => setNumeFirma(e.target.value)}
                placeholder="SC Exemplu SRL"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">CUI *</label>
              <input type="text" value={cuiFirma} onChange={e => setCuiFirma(e.target.value)}
                placeholder="RO12345678"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email firmă</label>
              <input type="email" value={emailFirma} onChange={e => setEmailFirma(e.target.value)}
                placeholder="office@firma.ro"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Telefon *</label>
              <input type="text" value={telefonFirma} onChange={e => setTelefonFirma(e.target.value)}
                placeholder="07xx xxx xxx"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500" />
            </div>

            {tipFirma === 'contabilitate' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Autorizație CECCAR *
                </label>
                <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition">
                  <span className="text-xl">📎</span>
                  <div>
                    <p className="font-semibold text-indigo-600 text-sm">
                      {documentCeccar ? documentCeccar.name : 'Încarcă documentul CECCAR'}
                    </p>
                    <p className="text-xs text-gray-400">PDF acceptat</p>
                  </div>
                  <input type="file" accept=".pdf" className="hidden"
                    onChange={e => setDocumentCeccar(e.target.files?.[0] || null)} />
                </label>
              </div>
            )}

            {tipFirma === 'client' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cum vei folosi platforma? *
                </label>
                <button onClick={() => setModFolosire('cu_firma_conta')}
                  className={`w-full py-3 px-4 rounded-xl border-2 text-left mb-2 transition ${modFolosire === 'cu_firma_conta' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                  <p className="font-bold text-gray-800 text-sm">🤝 Prin firmă de contabilitate</p>
                  <p className="text-xs text-gray-500 mt-1">Contabilul meu e pe această platformă</p>
                </button>
                <button onClick={() => setModFolosire('independent')}
                  className={`w-full py-3 px-4 rounded-xl border-2 text-left transition ${modFolosire === 'independent' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                  <p className="font-bold text-gray-800 text-sm">🔓 Independent</p>
                  <p className="text-xs text-gray-500 mt-1">Folosesc platforma pe cont propriu</p>
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setEroare(''); setPas(2) }}
                className="w-1/3 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition">
                ← Înapoi
              </button>
              <button onClick={handleRegister} disabled={loading}
                className="w-2/3 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                {loading ? 'Se creează contul...' : 'Creează cont'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          Ai deja cont?{' '}
          <Link href="/auth/login" className="text-indigo-600 hover:underline font-semibold">
            Intră în cont
          </Link>
        </p>

      </div>
    </main>
  )
}