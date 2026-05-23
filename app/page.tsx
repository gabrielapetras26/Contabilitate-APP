import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md text-center">
        
        <div className="mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📊</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Portal Contabilitate</h1>
          <p className="text-gray-500 mt-2">Gestionează documentele financiare simplu și sigur</p>
        </div>

        <div className="space-y-3">
          <Link href="/auth/login" 
            className="block w-full py-3 px-6 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            Intră în cont
          </Link>
          <Link href="/auth/register"
            className="block w-full py-3 px-6 border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition">
            Creează cont nou
          </Link>
        </div>

        <p className="text-gray-400 text-sm mt-6">
          Ești o firmă de contabilitate? {' '}
          <Link href="/auth/register-conta" className="text-indigo-600 hover:underline">
            Înregistrează-te aici
          </Link>
        </p>

      </div>
    </main>
  )
}