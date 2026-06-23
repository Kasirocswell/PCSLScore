'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { signupAction } from '../actions'
import { Target, Lock, Mail, Loader2, ArrowRight, Award, User, Shield } from 'lucide-react'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accountType, setAccountType] = useState<'shooter' | 'director'>('shooter')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    formData.append('accountType', accountType)

    const result = await signupAction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-950 via-neutral-950 to-black text-slate-100 overflow-hidden relative">
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Auth Card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-3xl p-8 max-w-md w-full transition-all duration-500 hover:border-white/15 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20 mb-4 animate-pulse">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Target className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Get Started
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Create an account to join the competition
          </p>
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Check your email</h3>
              <p className="text-sm text-slate-400">
                We&apos;ve sent a verification link to your email address. Please click it to complete registration.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all duration-200 text-sm cursor-pointer"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Account Type Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Shooter Option */}
                  <button
                    type="button"
                    onClick={() => setAccountType('shooter')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-300 relative cursor-pointer ${
                      accountType === 'shooter'
                        ? 'border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/5 text-white'
                        : 'border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User className={`w-5 h-5 ${accountType === 'shooter' ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-sm font-semibold">Shooter</span>
                    <span className="text-[10px] opacity-75">View & register matches</span>
                  </button>

                  {/* Match Director Option */}
                  <button
                    type="button"
                    onClick={() => setAccountType('director')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-300 relative cursor-pointer ${
                      accountType === 'director'
                        ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/5 text-white'
                        : 'border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Shield className={`w-5 h-5 ${accountType === 'director' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-sm font-semibold">Match Director</span>
                    <span className="text-[10px] opacity-75">Build & score matches</span>
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 focus:outline-none transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center mt-8 pt-6 border-t border-white/5">
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="text-emerald-400 hover:underline font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
