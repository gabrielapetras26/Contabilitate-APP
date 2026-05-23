'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SchimbaParola() {
  const router = useRouter()
  const [parolaNoua, setParolaNoua] = useState('')
  const [confirmaParola, setConfirmaParola] = useState('')
  const [eroare, setEroare] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSchimbaParola() {
    setLoading(true)
    setEroare('')

    if (!parolaNoua || !confirmaParola) {
      setEroare('Completează ambele câmpuri.')
      setLoading(false)
      return
    }

    if (parolaNoua.length < 6) {
      setEroare('Parola trebuie să aibă minim 6 caractere.')
      setLoading(false)
      return
    }

    if (parolaNoua !== confirmaParola) {
      setEroare('Parolele nu coincid.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: parolaNoua
    })

    if (error) {
      setEroare('Eroare la schimbarea parolei: ' + error.message)
      setLoading(false)
      return
    }

    // Dupa schimbarea parolei, redirectionam la dashboard
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: roluri } = await supabase
        .from('utilizator_roluri')
        .select('rol')
        .eq('utilizator_id', user.id)
        .eq('activ', true)

      if (roluri && roluri.length > 0) {
        const rol = roluri[0].rol
        if (rol === 'admin_platforma') router.push('/dashboard/super-admin')
        else if (rol === 'admin_conta') router.push('/dashboard/admin-conta')
        else if (rol === 'contabil') router.push('/dashboard/contabil')
        else router.push('/dashboard/firma')
      }
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Schimbă parola</h1>
          <p className="text-gray-500 mt-1">Setează o parolă nouă pentru contul tău</p>
        </div>

        {eroare && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {eroare}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Parolă nouă</label>
            <input
              type="password"
              value={parolaNoua}
              onChange={e => setParolaNoua(e.target.value)}
              placeholder="Minim 6 caractere"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmă parola</label>
            <input
              type="password"
              value={confirmaParola}
              onChange={e => setConfirmaParola(e.target.value)}
              placeholder="Repetă parola nouă"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleSchimbaParola}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Se salvează...' : 'Salvează parola nouă'}
          </button>
        </div>

      </div>
    </main>
  )
}