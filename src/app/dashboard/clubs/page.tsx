import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Building2, Plus, MapPin, ArrowLeft, ChevronRight, Calendar } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Manage Clubs | PCSL Score',
  description: 'Manage your practical competition shooting clubs and events.',
}

export default async function ClubsPage() {
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

  // Fetch all clubs created by this director
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

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
              Manage Shooting Clubs
            </h1>
            <p className="text-sm text-slate-400">
              Create and configure clubs to host official Practical Competition Shooting League matches.
            </p>
          </div>

          <Link
            href="/dashboard/clubs/create"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Create Club
          </Link>
        </div>

        {/* Error State if clubs fetch failed */}
        {clubsError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            Failed to load clubs: {clubsError.message}
          </div>
        )}

        {/* Clubs List / Cards Grid */}
        {!clubsError && (
          clubs && clubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 p-6 rounded-2xl transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Club Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {club.name}
                          </h2>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Created {new Date(club.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{club.location}</span>
                    </div>

                    {/* Description */}
                    {club.description ? (
                      <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed border-t border-white/5 pt-3">
                        {club.description}
                      </p>
                    ) : (
                      <p className="text-sm italic text-slate-500 border-t border-white/5 pt-3">
                        No description provided for this club.
                      </p>
                    )}
                  </div>

                  <div className="pt-6 mt-4 border-t border-white/5 flex justify-end">
                    <Link
                      href={`/dashboard/clubs/${club.id}/edit`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors group/btn"
                    >
                      Configure & Edit
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
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">No Clubs Formed Yet</h3>
                <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                  Get started by creating your shooting club. Once formed, you will be able to post events, schedule squads, register competitors, and input scores.
                </p>
              </div>
              <Link
                href="/dashboard/clubs/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Build Your First Club
              </Link>
            </div>
          )
        )}

      </div>
    </div>
  )
}
