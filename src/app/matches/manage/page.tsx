import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Target, Plus, MapPin, ArrowLeft, ChevronRight, Calendar, Users, Layers, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Manage Matches | PCSL Score',
  description: 'Track and configure your created Practical Competition Shooting League matches.',
}

export default async function ManageMatchesPage() {
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

  // Fetch user role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'director') {
    redirect('/dashboard')
  }

  // Fetch all matches created by this director
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      clubs ( name ),
      stages ( id ),
      squads ( id ),
      registrations ( id )
    `)
    .eq('created_by', user.id)
    .order('date', { ascending: false })

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 relative">
      {/* Decorative Glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group mb-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Manage PCSL Matches
            </h1>
            <p className="text-sm text-slate-400">
              Create matches, structure stages, configure squads, and score competitors in real-time.
            </p>
          </div>

          <Link
            href="/matches/create"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create Match
          </Link>
        </div>

        {/* Error State if matches fetch failed */}
        {matchesError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            Failed to load matches: {matchesError.message}
          </div>
        )}

        {/* Matches List */}
        {!matchesError && (
          matches && matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matches.map((match: any) => (
                <div
                  key={match.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 p-6 rounded-2xl transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Match Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Target className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {match.name}
                            </h2>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              match.is_published 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/25'
                            }`}>
                              {match.is_published ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  Published
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  Draft
                                </>
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-400 font-semibold mt-1">
                            Hosted by {match.clubs?.name || 'Club'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300 border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{new Date(match.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{match.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Type: {match.match_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Fee:</span>
                        <span className="font-bold text-emerald-400">
                          {match.payment_required ? `$${match.price}` : 'Free'}
                        </span>
                      </div>
                    </div>

                    {/* Simple metrics */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/50 rounded-xl border border-white/5 text-center">
                      <div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Stages</div>
                        <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          {match.stages?.length || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Squads</div>
                        <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          {match.squads?.length || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Shooters</div>
                        <div className="text-lg font-bold text-white flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          {match.registrations?.length || 0}
                        </div>
                      </div>
                    </div>

                    {/* Match Description */}
                    {match.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {match.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-6 mt-4 border-t border-white/5 flex justify-end">
                    <Link
                      href={`/matches/${match.id}/manage`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors group/btn"
                    >
                      Workspace & Configure
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-12 rounded-2xl flex flex-col justify-center items-center text-center max-w-2xl mx-auto space-y-6">
              <div className="w-16 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Target className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">No Matches Formed Yet</h3>
                <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                  Get started by creating your first Practical Competition Shooting League match. Define stages, set up squad sheets, and handle registrations.
                </p>
              </div>
              <Link
                href="/matches/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Build Your First Match
              </Link>
            </div>
          )
        )}

      </div>
    </div>
  )
}
