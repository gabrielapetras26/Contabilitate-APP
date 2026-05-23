'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterConta() {
  const [nume, setNume] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [parola, setParola] = useState('')
  const [eroare, setEroare] = useState('')
  const [succes, setSucces] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setLoading(true)
    setEroare('')

    if (!nume || !email || !parola) {
      setEroare('Te rugăm completează toate câmpurile obligatorii.')
      setLoading(false)
      return
    }

    if (parola.length < 6) {
      setEroare('Parola trebuie să aibă minim 6 caractere.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: parola,
      options: {
        data: { nume, rol: 'admin_conta' }
      }
    })

    if (error) {
      setEroare('Eroare: ' + error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: firma } = await supabase
        .from('firme_contabilitate')
        .insert({
          nume,
          email,
          telefon
        })
        .select()
        .single()

      await supabase.from('profiluri').insert({
        id: data.user.id,
        nume,
        email,
        rol: 'admin_conta',
        firma_contabilitate_id: firma?.id
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cerere trimisă!</h2>
          <p className="text-gray-500 mb-6">
            Contul tău va fi activat după verificarea de către echipa noastră. 
            Vei primi un email de confirmare.
          </p>
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
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Înregistrare firmă contabilitate</h1>
          <p className="text-gray-500 mt-1">Contul va fi activat după verificare</p>
        </div>

        {eroare && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {eroare}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Denumire firmă contabilitate <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nume}
              onChange={e => setNume(e.target.value)}
              placeholder="Ex: SC Contabil Expert SRL"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="office@firmaconta.ro"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={telefon}
              onChange={e => setTelefon(e.target.value)}
              placeholder="07xx xxx xxx"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Parolă <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={parola}
              onChange={e => setParola(e.target.value)}
              placeholder="Minim 6 caractere"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Se trimite cererea...' : 'Trimite cererea'}
          </button>
        </div>

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