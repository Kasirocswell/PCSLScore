import React from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { geocodeAddress, getDistanceInMiles } from '@/utils/geocoding'
import {
  Target,
  Search,
  Filter,
  Sparkles,
  PlusCircle,
  MapPin
} from 'lucide-react'
import MatchRegistryClient from './MatchRegistryClient'

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
  clubs: { id: string; name: string; zip_code: string | null; latitude: number | null; longitude: number | null } | null
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
  const locQuery = typeof params.loc === 'string' ? params.loc.trim() : (typeof params.zip === 'string' ? params.zip.trim() : '')
  const radiusQuery = typeof params.radius === 'string' ? params.radius.trim() : 'all'
  const viewMode = typeof params.view === 'string' ? params.view.trim() : 'grid'
  const filterType = typeof params.type === 'string' ? params.type : 'all'
  const activeTab = typeof params.tab === 'string' ? params.tab : 'upcoming'

  const getQueryString = (overrides: Record<string, string>) => {
    const finalParams = {
      tab: activeTab,
      view: viewMode,
      q: searchQuery,
      loc: locQuery,
      radius: radiusQuery,
      type: filterType,
      ...overrides
    }
    const searchParams = new URLSearchParams()
    Object.entries(finalParams).forEach(([key, val]) => {
      if (val && val !== 'all' && (key !== 'view' || val !== 'grid') && (key !== 'tab' || val !== 'upcoming')) {
        searchParams.set(key, val)
      } else if (key === 'tab' && val === 'past') {
        searchParams.set(key, val)
      } else if (key === 'view' && val === 'map') {
        searchParams.set(key, val)
      }
    })
    const qs = searchParams.toString()
    return qs ? `?${qs}` : '/matches'
  }

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
        zip_code,
        latitude,
        longitude
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

  // Geocode location search if specified
  let searchCoords: { lat: number; lon: number } | null = null
  let geocodeFailed = false

  if (locQuery) {
    searchCoords = await geocodeAddress(locQuery)
    if (!searchCoords && radiusQuery !== 'all') {
      geocodeFailed = true
    }
  }

  // Apply location/radius/distance filtering
  if (searchCoords && radiusQuery !== 'all') {
    const radiusMiles = parseFloat(radiusQuery)
    if (!isNaN(radiusMiles)) {
      matches = matches.filter(match => {
        const club = match.clubs
        if (club && typeof club.latitude === 'number' && typeof club.longitude === 'number') {
          const dist = getDistanceInMiles(searchCoords!.lat, searchCoords!.lon, club.latitude, club.longitude)
          return dist <= radiusMiles
        }
        return false
      })
    }
  } else if (locQuery) {
    // Fallback to text matching if radius is 'all' or if geocoding failed
    const locLower = locQuery.toLowerCase()
    matches = matches.filter(
      match =>
        match.location.toLowerCase().includes(locLower) ||
        (match.clubs && (
          match.clubs.name.toLowerCase().includes(locLower) ||
          (match.clubs.zip_code && match.clubs.zip_code.toLowerCase().includes(locLower))
        ))
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
          {/* Keep tab state and view state when applying search filters */}
          <input type="hidden" name="tab" value={activeTab} />
          <input type="hidden" name="view" value={viewMode} />

          {/* Search Input */}
          <div className="md:col-span-3 relative group">
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

          {/* Location Input */}
          <div className="md:col-span-3 relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <MapPin className="w-4 h-4" />
            </span>
            <input
              type="text"
              name="loc"
              defaultValue={locQuery}
              placeholder="City or ZIP code..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
            />
          </div>

          {/* Radius Selector */}
          <div className="md:col-span-2 relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Target className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            </span>
            <select
              name="radius"
              defaultValue={radiusQuery}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Miles</option>
              <option value="10">10 Miles</option>
              <option value="25">25 Miles</option>
              <option value="50">50 Miles</option>
              <option value="100">100 Miles</option>
              <option value="250">250 Miles</option>
            </select>
          </div>

          {/* Match Type Filter */}
          <div className="md:col-span-2 relative group">
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
              className="w-full h-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold rounded-xl text-sm transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Apply Filter
            </button>
          </div>
        </form>

        <MatchRegistryClient
          matches={matches}
          user={user}
          userRole={userRole}
          todayStr={todayStr}
          activeTab={activeTab}
          viewMode={viewMode}
          searchQuery={searchQuery}
          locQuery={locQuery}
          radiusQuery={radiusQuery}
          filterType={filterType}
          searchCoords={searchCoords}
          geocodeFailed={geocodeFailed}
        />

      </div>
    </div>
  )
}
