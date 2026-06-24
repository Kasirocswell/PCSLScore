'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMatchAction } from '../actions'
import { ArrowLeft, Target, Calendar, MapPin, AlignLeft, DollarSign, Loader2, Save, Users } from 'lucide-react'

interface Club {
  id: string
  name: string
  location: string
}

interface CreateMatchFormProps {
  clubs: Club[]
}

export default function CreateMatchForm({ clubs }: CreateMatchFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState(clubs[0]?.id || '')
  const router = useRouter()

  // Update range location if the club changes
  function handleClubChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const clubId = e.target.value
    setSelectedClubId(clubId)
    const selectedClub = clubs.find(c => clubId === c.id)
    if (selectedClub) {
      const locationInput = document.getElementById('location') as HTMLInputElement
      if (locationInput) {
        locationInput.value = selectedClub.location
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const result = await createMatchAction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/matches/${result.matchId}/manage`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group mb-3"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Create PCSL Match
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Design a new match, configure dynamic stages, set competitor squads, and prepare for scoring.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Shooting Club Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Hosting Shooting Club <span className="text-emerald-400 font-bold">*</span>
              </label>
              <select
                name="club_id"
                required
                value={selectedClubId}
                onChange={handleClubChange}
                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all duration-200 text-sm"
              >
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Match Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Match Name <span className="text-emerald-400 font-bold">*</span>
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                  <Target className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. PCSL Northern Championship"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Match Type & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Match Type <span className="text-emerald-400 font-bold">*</span>
                </label>
                <select
                  name="match_type"
                  required
                  className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all duration-200 text-sm"
                >
                  <option value="2-Gun">2-Gun</option>
                  <option value="Pistol Caliber 2-Gun">Pistol Caliber 2-Gun</option>
                  <option value="Rifle">Rifle</option>
                  <option value="Pistol">Pistol</option>
                  <option value="Shotgun">Shotgun</option>
                  <option value="3-Gun">3-Gun</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Match Date <span className="text-emerald-400 font-bold">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    name="date"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Range Location <span className="text-emerald-400 font-bold">*</span>
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="location"
                  id="location"
                  required
                  defaultValue={clubs[0]?.location || ''}
                  placeholder="e.g. 123 Gun Range Road, Boulder, CO"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Match Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Match Description
              </label>
              <div className="relative group">
                <span className="absolute top-3 left-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                  <AlignLeft className="w-4 h-4" />
                </span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Details about schedules, divisions, requirements, range procedures..."
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm resize-none"
                />
              </div>
            </div>

            {/* Payment & Price Settings */}
            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-white">Payment Required to Squad</label>
                  <p className="text-xs text-slate-400">Lock competitor squad selection until registration fee is prepaid.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="payment_required"
                    value="true"
                    checked={paymentRequired}
                    onChange={(e) => setPaymentRequired(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {paymentRequired && (
                <div className="pt-4 border-t border-white/5 space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Registration Fee (USD) <span className="text-emerald-400 font-bold">*</span>
                      </label>
                      <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-200">
                          <DollarSign className="w-4 h-4" />
                        </span>
                        <input
                          type="number"
                          name="price"
                          required={paymentRequired}
                          min="0.01"
                          step="0.01"
                          placeholder="45.00"
                          className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Payment Collection Method <span className="text-emerald-400 font-bold">*</span>
                      </label>
                      <select
                        name="payment_method"
                        required={paymentRequired}
                        defaultValue="online"
                        className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all duration-200 text-sm"
                      >
                        <option value="online">Online Prepayment (Stripe)</option>
                        <option value="cash">Cash In Person (At Match)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Publishing Setting */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-slate-900/40">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-white">Publish Immediately</label>
                <p className="text-xs text-slate-400">Make this match instantly discoverable by public shooters.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_published"
                  value="true"
                  defaultChecked={false}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-checked:after:bg-white"></div>
              </label>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-end items-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Match
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
