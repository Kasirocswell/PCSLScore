'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  registerForMatchAction,
  joinSquadAction,
  createMatchPaymentSessionAction
} from '../actions'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Target,
  CreditCard,
  Lock,
  Unlock,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Trophy,
  Sparkles,
  DollarSign,
  Award,
  BookOpen,
  UserCheck,
  FileText,
  Image,
  ExternalLink
} from 'lucide-react'

interface Stage {
  id: string
  name: string
  stage_number: number
  description: string | null
  stage_plan_url?: string | null
  required_hits_per_paper_target: number
  required_hits_per_steel_target: number
  max_points: number
}

interface Squad {
  id: string
  name: string
  max_capacity: number
}

interface Profile {
  id: string
  full_name: string | null
  email: string
}

interface Registration {
  id: string
  profile_id: string
  division: string
  payment_status: 'pending' | 'paid' | 'free'
  squad_id: string | null
  profiles: Profile | null
}

interface MatchDetails {
  id: string
  name: string
  description: string | null
  date: string
  location: string
  match_type: string
  payment_required: boolean
  price: number
  is_published: boolean
  created_by: string
  clubs: { id: string; name: string; location: string } | null
  stages: Stage[] | null
  squads: Squad[] | null
  registrations: Registration[] | null
}

interface CurrentUser {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface MatchRegistrationClientProps {
  match: MatchDetails
  currentUser: CurrentUser | null
}

export default function MatchRegistrationClient({
  match,
  currentUser
}: MatchRegistrationClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentParam = searchParams?.get('payment')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    paymentParam === 'cancel' ? 'Stripe Checkout transaction cancelled. Please complete payment to squad.' : null
  )
  const [success, setSuccess] = useState<string | null>(
    paymentParam === 'success' ? 'Payment Completed! Your match entry fee has been processed and squadding has been unlocked.' : null
  )

  // Selected Division Form State
  const [selectedDivision, setSelectedDivision] = useState('Competition')

  // Selected Squad details drawer state
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(
    match.squads && match.squads.length > 0 ? match.squads[0].id : null
  )

  const registrations = match.registrations || []
  const userRegistration = currentUser
    ? registrations.find(r => r.profile_id === currentUser.id)
    : null

  const isRegistered = !!userRegistration
  const paymentStatus = userRegistration?.payment_status || 'pending'
  const isPaymentPending = match.payment_required && match.price > 0 && paymentStatus === 'pending'
  // If payment param is success, override the lock in the UI to allow squad selection immediately while webhook finishes.
  const isSquaddingLocked = isPaymentPending && paymentParam !== 'success'

  // Poll to check for payment webhook completion if user returns from Stripe but db has not updated yet
  useEffect(() => {
    if (paymentParam === 'success' && paymentStatus === 'pending') {
      const interval = setInterval(() => {
        router.refresh()
      }, 1500)
      return () => clearInterval(interval)
    }
  }, [paymentParam, paymentStatus, router])

  // Get selected squad item
  const selectedSquad = match.squads?.find(s => s.id === selectedSquadId)
  const selectedSquadShooters = selectedSquad
    ? registrations.filter(r => r.squad_id === selectedSquad.id)
    : []

  // Toast Helpers
  function triggerError(msg: string) {
    setError(msg)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function triggerSuccess(msg: string) {
    setSuccess(msg)
    setError(null)
    setTimeout(() => setSuccess(null), 4000)
  }

  // 1. Register for Match Action
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) {
      router.push('/auth/login')
      return
    }
    setLoading(true)
    setError(null)

    const res = await registerForMatchAction(match.id, selectedDivision)
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess('Successfully registered for the match! Please squad next.')
      router.refresh()
    }
  }

  // 2. Stripe Checkout Payment Action
  async function handleRealPayment() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await createMatchPaymentSessionAction(match.id)
      if (res?.error) {
        triggerError(res.error)
        setLoading(false)
      } else if (res?.url) {
        window.location.href = res.url
      } else {
        triggerError('Failed to initiate Stripe Checkout session.')
        setLoading(false)
      }
    } catch (err: any) {
      triggerError(err?.message || 'An unexpected error occurred during Stripe redirect.')
      setLoading(false)
    }
  }

  // 3. Join / Change Squad Action
  async function handleJoinSquad(squadId: string) {
    setLoading(true)
    setError(null)

    const res = await joinSquadAction(match.id, squadId, paymentParam === 'success')
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess('Successfully assigned to squad!')
      router.refresh()
    }
  }

  // 4. Leave squad (unassign) Action
  async function handleLeaveSquad() {
    setLoading(true)
    setError(null)

    const res = await joinSquadAction(match.id, null)
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess('Successfully unassigned from squad!')
      router.refresh()
    }
  }

  // Clean formatted date
  const matchDate = new Date(match.date + 'T00:00:00')
  const formattedDate = matchDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  // Sort stages by number
  const sortedStages = [...(match.stages || [])].sort((a, b) => a.stage_number - b.stage_number)

  // Sort squads deterministically
  const sortedSquads = [...(match.squads || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const officialDivisions = [
    { value: 'Competition', label: 'Competition (Optics, Compensators, High Cap)' },
    { value: 'Practical', label: 'Practical (Duty Style Guns, Standard Cap)' },
    { value: 'PCC', label: 'PCC (Pistol Caliber Carbine)' },
    { value: 'Limited', label: 'Limited (Iron Sights, No Comp, Stand Cap)' },
    { value: 'Production', label: 'Production (Standard Double/Striker Action)' }
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-950 via-zinc-950 to-black text-slate-100 py-12 relative">
      {/* Background Glows */}
      <div className="absolute top-12 left-12 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* Back navigation */}
        <div>
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white hover:underline transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Match Directory
          </Link>
        </div>

        {/* Notifications and Toasts */}
        {error && (
          <div className="backdrop-blur-xl bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-300">Action Blocked</h4>
              <p className="text-xs text-rose-200/80 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3 animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-300">Success</h4>
              <p className="text-xs text-emerald-200/80 leading-relaxed">{success}</p>
            </div>
          </div>
        )}

        {/* Hero Jumbotron */}
        <div className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 p-8 sm:p-10 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-2xl">
          {/* Subtle line glow */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500" />

          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300">
              <Award className="w-3.5 h-3.5" />
              PCSL Sanctioned Match
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              {match.name}
            </h1>
            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500" />
                {match.location}
              </span>
            </p>
            {match.clubs && (
              <p className="text-xs text-slate-400">
                Hosted by the shooting club: <strong className="text-slate-300">{match.clubs.name}</strong>
              </p>
            )}
          </div>

          {/* Price & Results Actions */}
          <div className="flex flex-row md:flex-col items-center gap-4 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-center">
            <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px] text-center flex-1 md:flex-initial">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Entry Fee</span>
              {match.payment_required && match.price > 0 ? (
                <strong className="text-2xl text-emerald-400 font-extrabold flex items-center mt-1">
                  <DollarSign className="w-5 h-5 -mr-0.5" />
                  {match.price}
                </strong>
              ) : (
                <strong className="text-base text-indigo-400 font-extrabold uppercase mt-1 tracking-wide">Free Entry</strong>
              )}
            </div>

            <Link
              href={`/matches/${match.id}/scores`}
              className="px-5 py-4 bg-gradient-to-r from-cyan-500/15 to-emerald-500/15 hover:from-cyan-500/25 hover:to-emerald-500/25 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 font-bold text-sm rounded-2xl transition active:scale-95 flex items-center gap-2 flex-1 md:flex-initial justify-center cursor-pointer shadow-lg shadow-cyan-500/5 whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-cyan-400" />
              View Leaderboards
            </Link>
          </div>
        </div>

        {/* Main Grid: Info on left, Action/Squad Console on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDE: MATCH DETAILS & STAGES */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Match Description */}
            {match.description && (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
                  Match Description & WSB Brief
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {match.description}
                </p>
              </div>
            )}

            {/* Stage Course of Fire Builder */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-4.5 h-4.5 text-indigo-400" />
                  Course of Fire ({sortedStages.length} Stages)
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  Match Total Points:{' '}
                  <strong className="text-indigo-400 font-extrabold">
                    {sortedStages.reduce((sum, s) => sum + s.max_points, 0)} pts
                  </strong>
                </span>
              </div>

              {sortedStages.length > 0 ? (
                <div className="space-y-4">
                  {sortedStages.map(stage => (
                    <div
                      key={stage.id}
                      className="backdrop-blur-xl bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3 hover:border-white/15 transition-all"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                              Stage {stage.stage_number}
                            </span>
                            {stage.name}
                          </h4>
                          {stage.description && (
                            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed italic">
                              "{stage.description}"
                            </p>
                          )}
                          {stage.stage_plan_url && (
                            <div className="mt-3 pt-2.5 border-t border-white/5">
                              {stage.stage_plan_url.toLowerCase().endsWith('.pdf') ? (
                                <a
                                  href={stage.stage_plan_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold transition-all cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                  View Stage Brief PDF
                                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400/80" />
                                </a>
                              ) : (
                                <div className="space-y-2">
                                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage Brief Diagram</span>
                                  <div className="relative group max-w-sm rounded-xl overflow-hidden border border-white/5 bg-slate-950/40 p-1">
                                    <img
                                      src={stage.stage_plan_url}
                                      alt={`${stage.name} Diagram`}
                                      className="object-contain max-h-[160px] rounded-lg w-auto"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                      <a
                                        href={stage.stage_plan_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-950/50 px-3 py-1.5 rounded-lg text-right shrink-0 border border-white/5">
                          <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-500">Max Score</span>
                          <strong className="text-xs font-bold text-indigo-300">{stage.max_points} points</strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-4 text-xs text-slate-400">
                        <div>
                          Required Paper Hits:{' '}
                          <strong className="text-slate-300">{stage.required_hits_per_paper_target} per target</strong>
                        </div>
                        <div>
                          Required Steel Hits:{' '}
                          <strong className="text-slate-300">{stage.required_hits_per_steel_target} per target</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-xs">
                  No courses of fire added to this match yet.
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: REGISTRATION CONSOLE & SQUAD PORTAL */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* PORTAL BOX 1: REGISTRATION CONTROL */}
            {!currentUser ? (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 text-center shadow-xl">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-lg">Shooter Portal Locked</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    You must sign in or register an account to sign up for this competition, squad, and log your hit scores.
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Link
                    href="/auth/login"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Sign Up Free
                  </Link>
                </div>
              </div>
            ) : !isRegistered ? (
              /* REGISTRATION FORM */
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl relative">
                <div className="absolute right-6 top-6 animate-pulse text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-white text-lg flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" />
                    Register for Match
                  </h4>
                  <p className="text-xs text-slate-400">
                    Join this competition. Select your division configuration to unlock squadding sheet.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Select Division
                    </label>
                    <div className="space-y-2">
                      {officialDivisions.map(div => (
                        <label
                          key={div.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all duration-200 text-xs leading-relaxed ${
                            selectedDivision === div.value
                              ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                          }`}
                        >
                          <input
                            type="radio"
                            name="division"
                            value={div.value}
                            checked={selectedDivision === div.value}
                            onChange={() => setSelectedDivision(div.value)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            selectedDivision === div.value
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-slate-600 bg-slate-900'
                          }`}>
                            {selectedDivision === div.value && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold block">{div.value}</span>
                            <span className="text-[10px] text-slate-400/90 block mt-0.5">{div.label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-xl text-xs shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4.5 h-4.5" />
                        Confirm Competitor Registration
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* CONFIRMED REGISTRATION WORKSPACE */
              <div className="space-y-6">
                
                {/* REGISTRATION CARD SUMMARY */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Confirmed Competitor
                      </span>
                      <h4 className="font-bold text-white text-lg mt-2">
                        {currentUser?.full_name || currentUser?.email}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Division: <strong className="text-indigo-400">{userRegistration.division}</strong>
                      </p>
                    </div>

                    {userRegistration.squad_id ? (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-right shrink-0">
                        <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400">Your Squad</span>
                        <strong className="text-xs text-indigo-300 font-extrabold">
                          {match.squads?.find(s => s.id === userRegistration.squad_id)?.name || 'Squad Sheet'}
                        </strong>
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-right shrink-0">
                        <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-400">Squad Status</span>
                        <strong className="text-xs text-amber-300 font-extrabold">Unassigned</strong>
                      </div>
                    )}
                  </div>

                  {/* PAYMENT BLOCK (IF PRICE & REQUIRED) */}
                  {match.payment_required && match.price > 0 && (
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      {paymentStatus === 'pending' && paymentParam !== 'success' ? (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3 animate-fadeIn">
                          <div className="flex items-start gap-2 text-xs text-amber-300 leading-relaxed font-semibold">
                            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Entry Fee Payment Required to Squad</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            This match director requires competitors to prepay the match entry fee of{' '}
                            <strong className="text-white font-extrabold">${match.price}</strong> before self-assigning onto the squad sheets.
                          </p>

                          <button
                            onClick={handleRealPayment}
                            disabled={loading}
                            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-indigo-500 hover:from-emerald-600 hover:to-indigo-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow transition-all duration-300 active:scale-95 cursor-pointer"
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                            Pay ${match.price} Entry Fee via Stripe
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300 font-semibold leading-none">
                          <CheckCircle className="w-4.5 h-4.5" />
                          <span>Match Entry Paid - Squadding Unlocked!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SQUAD SELECTION MODULE */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4 shadow-xl">
                  <div>
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      {isSquaddingLocked ? (
                        <Lock className="w-4.5 h-4.5 text-slate-500" />
                      ) : (
                        <Unlock className="w-4.5 h-4.5 text-indigo-400" />
                      )}
                      Match Squad Board
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {isSquaddingLocked
                        ? 'Unlock squadding by processing your pending payment above.'
                        : 'Self-assign to your preferred squad to shoot alongside your peers.'}
                    </p>
                  </div>

                  {sortedSquads.length > 0 ? (
                    <div className="space-y-6">
                      {/* Squads Radio Selection List */}
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1.5 custom-scrollbar">
                        {sortedSquads.map(squad => {
                          const squadShootersCount = registrations.filter(r => r.squad_id === squad.id).length
                          const isFull = squadShootersCount >= squad.max_capacity
                          const isUserOnThisSquad = userRegistration.squad_id === squad.id
                          const isSelected = selectedSquadId === squad.id

                          return (
                            <div
                              key={squad.id}
                              onClick={() => {
                                if (!isSquaddingLocked) {
                                  setSelectedSquadId(squad.id)
                                }
                              }}
                              className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                                isSquaddingLocked
                                  ? 'opacity-40 bg-slate-900/35 border-white/5 cursor-not-allowed'
                                  : isUserOnThisSquad
                                  ? 'bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-500 cursor-pointer shadow-md shadow-emerald-500/5'
                                  : isSelected
                                  ? 'bg-indigo-500/10 border-indigo-500/50 hover:border-indigo-500 cursor-pointer shadow-md shadow-indigo-500/5'
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer'
                              }`}
                            >
                              <div className="space-y-1">
                                <h5 className="font-bold text-xs text-slate-200 flex items-center gap-2">
                                  {squad.name}
                                  {isUserOnThisSquad && (
                                    <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                                      Your Squad
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[10px] text-slate-400">
                                  Slot breakdown:{' '}
                                  <strong className={isFull ? 'text-rose-400' : 'text-slate-300'}>
                                    {squadShootersCount} / {squad.max_capacity}
                                  </strong>{' '}
                                  max shooters
                                </p>
                              </div>

                              {isSquaddingLocked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                              ) : isUserOnThisSquad ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-500'
                                    : 'border-slate-600 bg-slate-900'
                                }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Selected Squad details roster drawer */}
                      {selectedSquad && (
                        <div className="border border-white/5 bg-slate-950/40 p-4 rounded-xl space-y-3.5 animate-fadeIn">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                              {selectedSquad.name} Roster
                            </h5>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {selectedSquadShooters.length} Shooters registered
                            </span>
                          </div>

                          {selectedSquadShooters.length > 0 ? (
                            <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {selectedSquadShooters.map(shooter => (
                                <li
                                  key={shooter.id}
                                  className="text-[11px] text-slate-300 flex justify-between items-center gap-2"
                                >
                                  <span className="truncate font-medium">
                                    {shooter.profiles?.full_name || shooter.profiles?.email}
                                  </span>
                                  <span className="text-[9px] font-bold text-indigo-400/90 capitalize">
                                    {shooter.division}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[10px] text-slate-500 py-1">
                              No competitors assigned to this squad yet. Be the first!
                            </p>
                          )}

                          {/* ACTION BUTTON TO JOIN/CHANGE/LEAVE SQUAD */}
                          {!isSquaddingLocked && (
                            <div className="pt-2">
                              {userRegistration.squad_id === selectedSquad.id ? (
                                <button
                                  onClick={handleLeaveSquad}
                                  disabled={loading}
                                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-300 font-bold text-xs rounded-lg transition-all active:scale-95 cursor-pointer"
                                >
                                  Unassign from Squad
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleJoinSquad(selectedSquad.id)}
                                  disabled={
                                    loading ||
                                    selectedSquadShooters.length >= selectedSquad.max_capacity
                                  }
                                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                >
                                  {selectedSquadShooters.length >= selectedSquad.max_capacity
                                    ? 'Squad is Full'
                                    : userRegistration.squad_id
                                    ? 'Switch to This Squad'
                                    : 'Join This Squad'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="p-6 text-center border border-white/5 bg-slate-950/20 rounded-xl text-slate-400 text-xs">
                      No squads configured by match director.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
