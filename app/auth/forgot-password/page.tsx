'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [eroare, setEroare] = useState('')
  const [succes, setSucces] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleResetare() {
    setLoading(true)
    setEroare('')

    if (!email) {
      setEroare('Introduceți adresa de email.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://contabilitate-app-kx3s.vercel.app/auth/schimba-parola'
    })

    if (error) {
      setEroare('Eroare: ' + error.message)
      setLoading(false)
      return
    }

    setSucces(true)
    setLoading(false)
  }

  if (succes) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Email trimis!</h2>
          <p className="text-gray-500 mb-6">
            Verifică emailul și apasă linkul de resetare a parolei.
          </p>
          <Link href="/auth/login"
            className="block w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            Înapoi la login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Ai uitat parola?</h1>
          <p className="text-gray-500 mt-1">Îți trimitem un link de resetare pe email</p>
        </div>

        {eroare && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {eroare}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResetare()}
              placeholder="email@exemplu.ro"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleResetare}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Se trimite...' : 'Trimite link de resetare'}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Îți amintești parola?{' '}
          <Link href="/auth/login" className="text-indigo-600 hover:underline font-semibold">
            Înapoi la login
          </Link>
        </p>

      </div>
    </main>
  )
}