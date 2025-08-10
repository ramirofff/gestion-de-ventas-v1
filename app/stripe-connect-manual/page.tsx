'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function StripeConnectManual() {
  const [accountData, setAccountData] = useState({
    accountId: '',
    businessName: '',
    email: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const router = useRouter()

  // Obtener usuario autenticado y verificar cuenta existente
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email })
        
        // Verificar si ya tiene una cuenta conectada
        const { data: existingAccount } = await supabase
          .from('connected_accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          
        if (existingAccount) {
          setMessage('⚠️ Ya tienes una cuenta Stripe conectada. Redirigiendo...')
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        }
      }
    }
    getUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setMessage('❌ Usuario no autenticado')
      return
    }
    
    if (!accountData.accountId.trim()) {
      setMessage('❌ El Account ID es requerido')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/stripe-connect/manual-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          stripeAccountId: accountData.accountId,
          businessName: accountData.businessName || 'Mi Negocio',
          customerEmail: accountData.email || user.email,
          country: 'AR'
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('✅ ¡Cuenta registrada exitosamente!')
        setTimeout(() => {
          // Forzar recarga completa para actualizar el estado
          window.location.href = '/'
        }, 2000)
      } else {
        setMessage(`❌ Error: ${result.error || 'No se pudo registrar la cuenta'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Error de conexión. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4"
      style={{ minHeight: '100vh', overflow: 'auto' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Registro Manual Stripe Connect
          </h1>
          <p className="text-gray-600">
            Completa los datos proporcionados por tu administrador
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account ID */}
            <div>
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
                Account ID de Stripe *
              </label>
              <input
                type="text"
                id="accountId"
                value={accountData.accountId}
                onChange={(e) => setAccountData({ ...accountData, accountId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="acct_xxxxxxxxxxxxxxxx"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Este ID te será proporcionado por tu administrador
              </p>
            </div>

            {/* Business Name */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Negocio
              </label>
              <input
                type="text"
                id="businessName"
                value={accountData.businessName}
                onChange={(e) => setAccountData({ ...accountData, businessName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mi Empresa SRL"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email de Contacto
              </label>
              <input
                type="email"
                id="email"
                value={accountData.email}
                onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contacto@miempresa.com"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '⏳ Registrando...' : '🔗 Registrar Cuenta Stripe'}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
              <p className="text-sm text-center">{message}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Instrucciones</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">1.</span>
              <p>Tu administrador ha creado una cuenta Stripe Connect para ti</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">2.</span>
              <p>Introduce el <strong>Account ID</strong> que te proporcionó</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">3.</span>
              <p>Completa los datos adicionales (opcional pero recomendado)</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">4.</span>
              <p>Haz clic en "Registrar Cuenta Stripe" para completar</p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-6 pb-8">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
