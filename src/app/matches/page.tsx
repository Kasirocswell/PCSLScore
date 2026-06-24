import React from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import {
  Target,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Award,
  DollarSign,
  ShieldCheck,
  PlusCircle,
  FolderLock
} from 'lucide-react'

export const revalidate = 0 // Dynamic SSR page

interface MatchWithRelations {
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
  clubs: { id: string; name: string; zip_code: string | null } | null
  stages: { id: string }[] | null
  squads: { id: string }[] | null
  registrations: { id: string; profile_id: string }[] | null
}

export default async function MatchesPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const searchQuery = typeof params.q === 'string' ? params.q.trim() : ''
  const zipQuery = typeof params.zip === 'string' ? params.zip.trim() : ''
  const filterType = typeof params.type === 'string' ? params.type : 'all'
  const activeTab = typeof params.tab === 'string' ? params.tab : 'upcoming'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userRole = 'shooter'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile) {
      userRole = profile.role
    }
  }

  // Fetch all matches that are published, OR if the logged in user created them
  let query = supabase
    .from('matches')
    .select(`
      id,
      name,
      description,
      date,
      location,
      match_type,
      payment_required,
      price,
      is_published,
      created_by,
      clubs (
        id,
        name,
        zip_code
      ),
      stages (
        id
      ),
      squads (
        id
      ),
      registrations (
        id,
        profile_id
      )
    `)
    .order('date', { ascending: true })

  const { data: matchesRaw, error } = await query

  if (error) {
    console.error('Error fetching matches:', error)
  }

  let matches: MatchWithRelations[] = (matchesRaw as any) || []

  // Filter out unpublished matches unless owned by the logged-in user
  matches = matches.filter(match => {
    if (match.is_published) return true
    if (user && match.created_by === user.id) return true
    return false
  })

  // Apply search query (filtering locally to ensure nesting joins work perfectly)
  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase()
    matches = matches.filter(
      match =>
        match.name.toLowerCase().includes(searchLower) ||
        match.location.toLowerCase().includes(searchLower) ||
        (match.description && match.description.toLowerCase().includes(searchLower)) ||
        (match.clubs && (
          match.clubs.name.toLowerCase().includes(searchLower) ||
          (match.clubs.zip_code && match.clubs.zip_code.toLowerCase().includes(searchLower))
        ))
    )
  }

  // Apply dedicated ZIP query
  if (zipQuery) {
    const zipLower = zipQuery.toLowerCase()
    matches = matches.filter(
      match => match.clubs && match.clubs.zip_code && match.clubs.zip_code.toLowerCase().includes(zipLower)
    )
  }

  // Apply match type filter
  if (filterType !== 'all') {
    matches = matches.filter(match => match.match_type === filterType)
  }

  // Calculate current date in local/timezone-safe YYYY-MM-DD
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const localDate = new Date(now.getTime() - (offset * 60 * 1000))
  const todayStr = localDate.toISOString().split('T')[0]

  // Partition matches into upcoming vs past
  const upcomingMatches = matches.filter(match => match.date >= todayStr)
  const pastMatches = matches.filter(match => match.date < todayStr)

  // Sort upcoming soonest first, past most recent first
  upcomingMatches.sort((a, b) => a.date.localeCompare(b.date))
  pastMatches.sort((a, b) => b.date.localeCompare(a.date))

  const activeMatches = activeTab === 'past' ? pastMatches : upcomingMatches

  const matchTypes = [
    '2-Gun',
    'Pistol Caliber 2-Gun',
    'Rifle',
    'Pistol',
    'Shotgun',
    '3-Gun'
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-950 via-zinc-950 to-black text-slate-100 py-12 relative">
      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              PCSL Match Registry
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Discover & Register
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl">
              Browse upcoming Practical Competition Shooting League events, sign up for your division, and reserve your squad.
            </p>
          </div>

          {user && userRole === 'director' && (
            <Link
              href="/matches/create"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-300 flex items-center gap-2 transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              Build New Match
            </Link>
          )}
        </div>

        {/* Filter Toolbar */}
        <form method="GET" className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          {/* Keep tab state when applying search filters */}
          <input type="hidden" name="tab" value={activeTab} />

          {/* Search Input */}
          <div className="md:col-span-4 relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Match name, range, club..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
            />
          </div>

          {/* ZIP Code Input */}
          <div className="md:col-span-3 relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <MapPin className="w-4 h-4" />
            </span>
            <input
              type="text"
              name="zip"
              defaultValue={zipQuery}
              placeholder="Filter by ZIP..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
            />
          </div>

          {/* Match Type Filter */}
          <div className="md:col-span-3 relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Filter className="w-4 h-4" />
            </span>
            <select
              name="type"
              defaultValue={filterType}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Match Types</option>
              {matchTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full h-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer active:scale-95"
            >
              Apply Filter
            </button>
          </div>
        </form>

        {/* Match Registry Tabs */}
        <div className="flex border-b border-white/10 gap-6 pb-2 animate-fadeIn">
          <Link
            href={`/matches?tab=upcoming${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${zipQuery ? `&zip=${encodeURIComponent(zipQuery)}` : ''}${filterType !== 'all' ? `&type=${encodeURIComponent(filterType)}` : ''}`}
            className={`pb-4 text-sm font-bold uppercase tracking-wider relative transition-all duration-200 ${
              activeTab !== 'past'
                ? 'text-indigo-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upcoming Matches ({upcomingMatches.length})
            {activeTab !== 'past' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" />
            )}
          </Link>
          <Link
            href={`/matches?tab=past${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${zipQuery ? `&zip=${encodeURIComponent(zipQuery)}` : ''}${filterType !== 'all' ? `&type=${encodeURIComponent(filterType)}` : ''}`}
            className={`pb-4 text-sm font-bold uppercase tracking-wider relative transition-all duration-200 ${
              activeTab === 'past'
                ? 'text-indigo-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Past Matches ({pastMatches.length})
            {activeTab === 'past' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" />
            )}
          </Link>
        </div>

        {/* Matches Grid */}
        {activeMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeMatches.map(match => {
              const registeredCount = match.registrations?.length || 0
              const isUserRegistered = user
                ? match.registrations?.some(r => r.profile_id === user.id)
                : false
              const isMatchOwner = user ? match.created_by === user.id : false

              // Format date cleanly
              const matchDate = new Date(match.date + 'T00:00:00')
              const formattedDate = matchDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })

              return (
                <div
                  key={match.id}
                  className="group relative flex flex-col justify-between backdrop-blur-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 shadow-xl hover:shadow-2xl"
                >
                  {/* Decorative Left Border Glow on Hover */}
                  <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-indigo-500 to-emerald-500 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="space-y-5">
                    {/* Tags */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        {match.match_type}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {!match.is_published && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                            <FolderLock className="w-3 h-3" />
                            Draft
                          </span>
                        )}

                        {isUserRegistered && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Registered
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Match Name & Club */}
                    <div>
                      <h3 className="text-xl font-extrabold text-white leading-snug group-hover:text-indigo-400 transition-colors">
                        {match.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Hosted by <span className="font-semibold text-slate-300">
                          {match.clubs?.name || 'Independent Club'}
                          {match.clubs?.zip_code ? ` (${match.clubs.zip_code})` : ''}
                        </span>
                      </p>
                    </div>

                    {/* Quick Metadata */}
                    <div className="space-y-2 text-sm text-slate-300 border-t border-b border-white/5 py-4">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span className="truncate" title={match.location}>{match.location}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>{registeredCount} Shooter{registeredCount === 1 ? '' : 's'} Registered</span>
                      </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-4 text-center bg-slate-950/40 border border-white/5 rounded-xl p-3">
                      <div>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Stages</span>
                        <strong className="text-base text-slate-100 font-extrabold">{match.stages?.length || 0} stages</strong>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Squads</span>
                        <strong className="text-base text-slate-100 font-extrabold">{match.squads?.length || 0} squads</strong>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Badge and Action */}
                  <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Entry Fee</span>
                      {match.payment_required && match.price > 0 ? (
                        <div className="flex items-center text-emerald-400 font-extrabold text-lg">
                          <DollarSign className="w-4 h-4 -mr-0.5" />
                          <span>{match.price}</span>
                        </div>
                      ) : (
                        <span className="text-indigo-400 font-extrabold text-sm uppercase tracking-wide">Free Entry</span>
                      )}
                    </div>

                    {isMatchOwner ? (
                      <Link
                        href={`/matches/${match.id}/manage`}
                        className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold text-xs group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        Manage Workspace
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : match.date < todayStr ? (
                      <Link
                        href={`/matches/${match.id}/scores`}
                        className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-xs group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        View Scores
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <Link
                        href={`/matches/${match.id}`}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isUserRegistered ? 'View Squadding' : 'Register Now'}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-16 rounded-2xl flex flex-col justify-center items-center text-center space-y-6 max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">No Matches Found</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We couldn't find any matches fitting your search criteria. Please adjust your keywords or choose a different match category filter.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
