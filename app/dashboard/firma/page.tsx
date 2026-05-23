'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardFirma() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [firme, setFirme] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    await incarcaFirme(user.id)
    setLoading(false)
  }

  async function incarcaFirme(userId: string) {
    const { data } = await supabase
      .from('firme_cliente')
      .select('*')
      .eq('admin_id', userId)
    setFirme(data || [])
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
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Portal Contabilitate</h1>
            <p className="text-sm text-gray-500">Bună ziua, {profil?.nume}!</p>
          </div>
          <button onClick={logout}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition">
            Ieși din cont
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Lista firme */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">Firmele mele</h2>
        </div>

        {firme.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <span className="text-5xl">🏢</span>
            <p className="text-gray-500 mt-4">Nu ai nicio firmă înregistrată.</p>
            <p className="text-gray-400 text-sm mt-1">Înregistrează o firmă nouă pentru a începe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {firme.map(firma => (
              <div key={firma.id}
                onClick={() => router.push(`/dashboard/firma/${firma.id}`)}
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{firma.nume}</h3>
                    {firma.cui && <p className="text-sm text-gray-500 mt-1">CUI: {firma.cui}</p>}
                    {firma.email && <p className="text-sm text-gray-500">{firma.email}</p>}
                    {firma.telefon && <p className="text-sm text-gray-500">{firma.telefon}</p>}
                  </div>
                  <span className="text-2xl">🏢</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    firma.mod_folosire === 'cu_firma_conta'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {firma.mod_folosire === 'cu_firma_conta' ? '🤝 Cu firmă contabilitate' : '🔓 Independent'}
                  </span>
                  <span className="text-sm text-indigo-600 font-semibold">Vezi documente →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}