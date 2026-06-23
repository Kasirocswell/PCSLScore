import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { 
  Trophy, 
  Calendar, 
  PlusCircle, 
  Settings, 
  Target, 
  ChevronRight, 
  Activity, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Users, 
  AlertTriangle,
  MapPin,
  TrendingUp,
  Award
} from 'lucide-react'
import Link from 'next/link'
import SubscribeButton from './SubscribeButton'

export const revalidate = 0 // Dynamic SSR page

export default async function DashboardPage() {
  const supabase = await createClient()
  
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (err) {
    // Ignore error
  }

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch complete profile with subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, subscription_active')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  const accountType = profile.role || 'shooter'
  const isSubscribed = profile.subscription_active || false

  // Load contextual dashboard data based on account type
  let directorMatches: any[] = []
  let shooterRegistrations: any[] = []

  if (accountType === 'director') {
    const { data: matches } = await supabase
      .from('matches')
      .select(`
        id,
        name,
        date,
        location,
        match_type,
        is_published,
        registrations ( id )
      `)
      .eq('created_by', user.id)
      .order('date', { ascending: false })
    
    directorMatches = matches || []
  } else {
    const { data: regs } = await supabase
      .from('registrations')
      .select(`
        id,
        division,
        payment_status,
        squads ( id, name ),
        matches (
          id,
          name,
          date,
          location,
          match_type
        )
      `)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    shooterRegistrations = regs || []
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 relative">
      {/* Decorative Blur background */}
      <div className="absolute top-1/3 left-1/3 w-96 h-80 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-80 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Welcome back, {profile.full_name || 'Competitor'}!
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Logged in as <span className="text-indigo-400 font-medium">{profile.email}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
              Role: <span className={accountType === 'director' ? 'text-emerald-400' : 'text-indigo-400'}>{accountType === 'director' ? 'Match Director' : 'Shooter'}</span>
            </span>
            {accountType === 'director' && (
              <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border ${isSubscribed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {isSubscribed ? 'Premium Portal Active' : 'Subscription Required'}
              </span>
            )}
          </div>
        </div>

        {/* Dashboard Content depending on Account Type */}
        {accountType === 'director' ? (
          <div className="space-y-8">
            {/* PAYWALL BLOCK (IF NOT SUBSCRIBED) */}
            {!isSubscribed && (
              <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/20 to-slate-900 p-8 backdrop-blur-xl space-y-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">Match Hosting Subscription Required</h2>
                    <p className="text-sm text-slate-400 max-w-2xl">
                      To host matches, construct stages, upload paper/steel targets layouts, and manage range scorekeepers, we require a flat-rate subscription of <span className="text-emerald-400 font-bold">$10.00 per month</span>. This helps fund server compute and score aggregation engines.
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-slate-200">What&apos;s included in premium Match Director access:</h3>
                    <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                      <li>Unlimited match registration entries</li>
                      <li>Custom stage planning tools (paper targets, steel setups, no-shoots)</li>
                      <li>Tactile Range tablet-scoring console (real-time offline sync logs)</li>
                      <li>Live leaderboards, competitor matrix grid, and division standings</li>
                    </ul>
                  </div>
                  
                  <SubscribeButton />
                </div>
              </div>
            )}

            {/* Dashboard Quick Actions & Matches list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Quick Actions Panel */}
              <div className="lg:col-span-1 space-y-6">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Quick Actions
                  </h2>
                  <p className="text-xs text-slate-400">
                    Deploy shooting clubs, configure divisions, design match targets, and score shooter runs.
                  </p>
                  <div className="space-y-3 pt-2">
                    <Link
                      href="/dashboard/clubs"
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-semibold text-white">Manage Clubs</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {isSubscribed ? (
                      <Link
                        href="/matches/create"
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <PlusCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-sm font-semibold text-white">Build a New Match</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 opacity-40 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                          <PlusCircle className="w-5 h-5 text-slate-500" />
                          <span className="text-sm font-semibold text-slate-400">Build a New Match (Locked)</span>
                        </div>
                        <CreditCard className="w-4 h-4 text-slate-500" />
                      </div>
                    )}

                    <Link
                      href="/matches"
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/10 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-semibold text-white">Browse Public Match Index</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Created Matches List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Target className="w-5 h-5 text-emerald-400" />
                    Matches You Are Directing ({directorMatches.length})
                  </h2>

                  {directorMatches.length > 0 ? (
                    <div className="space-y-4 pt-2">
                      {directorMatches.map((match) => (
                        <div 
                          key={match.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <h3 className="font-bold text-white text-base leading-snug">{match.name}</h3>
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${match.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                {match.is_published ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                {match.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                {match.registrations?.length || 0} Registered
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Link
                              href={`/matches/${match.id}/manage`}
                              className="flex-1 sm:flex-initial text-center text-xs font-semibold px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer"
                            >
                              Manage Stage / Squads
                            </Link>
                            <Link
                              href={`/matches/${match.id}/score`}
                              className="flex-1 sm:flex-initial text-center text-xs font-bold px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                            >
                              Range Scoring
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center text-center py-12 px-6 bg-white/2 rounded-xl border border-dashed border-white/5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                        <Target className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5">No Created Matches Found</h3>
                      <p className="text-slate-400 text-xs max-w-sm">
                        {isSubscribed ? (
                          'Get started by creating your first shooting event, building custom stages, and registering squads.'
                        ) : (
                          'Subscribe to our premium Match Director portal above to activate match design and range scorekeeping.'
                        )}
                      </p>
                      {isSubscribed && (
                        <Link
                          href="/matches/create"
                          className="mt-4 inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Build a Match
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Shooter Progress Card & Gateway */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Premium Progress Callout */}
              <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 to-slate-900 p-6 backdrop-blur-xl space-y-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white tracking-tight">Performance Visualizations</h2>
                  <p className="text-xs text-slate-400">
                    Analyze your previous stage runs, hit factors, accuracy trends, and points-per-second ratios.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/dashboard/scores"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs tracking-wide uppercase transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    <Award className="w-4 h-4" />
                    <span>View Progress Dashboard</span>
                  </Link>
                </div>
              </div>

              {/* Simple Competitor Portal Links */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Quick Links</h2>
                <div className="space-y-2">
                  <Link
                    href="/matches"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-white">Discover Matches</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

            </div>

            {/* Registered Matches (Competitor List) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Trophy className="w-5 h-5 text-indigo-400" />
                  Your Active Match Registrations ({shooterRegistrations.length})
                </h2>

                {shooterRegistrations.length > 0 ? (
                  <div className="space-y-4 pt-1">
                    {shooterRegistrations.map((reg) => {
                      const match = reg.matches
                      const squad = reg.squads
                      const isPaid = reg.payment_status === 'paid' || reg.payment_status === 'free'

                      return (
                        <div 
                          key={reg.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className="space-y-1">
                            <h3 className="font-bold text-white text-base leading-snug">{match.name}</h3>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                {match.location}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10 px-2.5 py-0.5 rounded-full">
                                Division: {reg.division}
                              </span>
                              <span className="text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10 px-2.5 py-0.5 rounded-full">
                                Squad: {squad?.name || 'Unassigned'}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                                {reg.payment_status === 'paid' ? 'Paid' : reg.payment_status === 'free' ? 'Free Entry' : 'Payment Pending'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Link
                              href={`/matches/${match.id}`}
                              className="flex-1 sm:flex-initial text-center text-xs font-semibold px-4.5 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer"
                            >
                              {isPaid ? 'Manage Squadding' : 'Pay Entry Fee'}
                            </Link>
                            <Link
                              href={`/matches/${match.id}/scores`}
                              className="flex-1 sm:flex-initial text-center text-xs font-bold px-4.5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                            >
                              View Standings
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center text-center py-12 px-6 bg-white/2 rounded-xl border border-dashed border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                      <Target className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">No Registered Matches</h3>
                    <p className="text-slate-400 text-xs max-w-sm">
                      You are not registered for any upcoming PCSL events. Browse the public directory to register and select squads.
                    </p>
                    <Link
                      href="/matches"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                    >
                      Browse Upcoming Matches
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
