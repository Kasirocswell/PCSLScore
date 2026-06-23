'use client'

import { useState } from 'react'
import { createSubscriptionSessionAction } from '@/app/matches/actions'
import { CreditCard, Loader2 } from 'lucide-react'

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await createSubscriptionSessionAction()
      if (res.error) {
        setError(res.error)
        setLoading(false)
      } else if (res.url) {
        window.location.href = res.url
      } else {
        setError('Failed to initiate checkout session')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 w-full max-w-md">
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold tracking-wide shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 cursor-pointer text-base uppercase"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Redirecting to Stripe secure portal...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Unlock Director Access — $10/mo</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center font-medium">
          {error}
        </div>
      )}
    </div>
  )
}
