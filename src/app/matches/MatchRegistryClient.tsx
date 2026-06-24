'use client'

import React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Calendar,
  MapPin,
  Users,
  Award,
  DollarSign,
  ShieldCheck,
  PlusCircle,
  FolderLock,
  ArrowRight
} from 'lucide-react'

// Dynamically import Leaflet MatchMap component with SSR disabled
const MatchMap = dynamic(() => import('./MatchMap'), { ssr: false })

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
  clubs: {
    id: string
    name: string
    zip_code: string | null
    latitude: number | null
    longitude: number | null
  } | null
  stages: { id: string }[] | null
  squads: { id: string }[] | null
  registrations: { id: string; profile_id: string }[] | null
}

interface MatchRegistryClientProps {
  matches: MatchWithRelations[]
  user: any
  userRole: string
  todayStr: string
  activeTab: string
  searchQuery: string
  locQuery: string
  radiusQuery: string
  filterType: string
  searchCoords: { lat: number; lon: number } | null
  geocodeFailed: boolean
}

export default function MatchRegistryClient({
  matches,
  user,
  userRole,
  todayStr,
  activeTab,
  searchQuery,
  locQuery,
  radiusQuery,
  filterType,
  searchCoords,
  geocodeFailed
}: MatchRegistryClientProps) {

  // Partition matches into upcoming vs past based on date and timezone safety
  const upcomingMatches = matches.filter(match => match.date >= todayStr)
  const pastMatches = matches.filter(match => match.date < todayStr)

  // Sort upcoming soonest first, past most recent first
  upcomingMatches.sort((a, b) => a.date.localeCompare(b.date))
  pastMatches.sort((a, b) => b.date.localeCompare(a.date))

  const activeMatches = activeTab === 'past' ? pastMatches : upcomingMatches

  const getQueryString = (overrides: Record<string, string>) => {
    const finalParams = {
      tab: activeTab,
      q: searchQuery,
      loc: locQuery,
      radius: radiusQuery,
      type: filterType,
      ...overrides
    }
    const searchParams = new URLSearchParams()
    Object.entries(finalParams).forEach(([key, val]) => {
      if (val && val !== 'all' && (key !== 'tab' || val !== 'upcoming')) {
        searchParams.set(key, val)
      } else if (key === 'tab' && val === 'past') {
        searchParams.set(key, val)
      }
    })
    const qs = searchParams.toString()
    return qs ? `?${qs}` : '/matches'
  }

  return (
    <div className="space-y-10">
      {/* Geocode Failure Banner */}
      {geocodeFailed && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-start gap-3 animate-fadeIn">
          <span className="text-base">⚠️</span>
          <div className="space-y-1">
            <p className="font-bold">Unable to resolve location coordinates</p>
            <p className="text-amber-400/80 text-xs">
              We couldn't geocode "{locQuery}". Falling back to text-based matching on city names and zip codes.
            </p>
          </div>
        </div>
      )}

      {/* Match Registry Tabs */}
      <div className="border-b border-white/10 pb-2">
        <div className="flex gap-6">
          <Link
            href={getQueryString({ tab: 'upcoming' })}
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
            href={getQueryString({ tab: 'past' })}
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
      </div>

      {activeMatches.length > 0 ? (
        <div className="space-y-10 animate-fadeIn">
          {/* Combined Map View First */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/40 shadow-2xl">
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md text-xs font-semibold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Interactive Match Map
            </div>
            <MatchMap
              matches={activeMatches}
              searchCoords={searchCoords}
              searchRadius={radiusQuery}
            />
          </div>

          {/* Separator or Section Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-emerald-500" />
              Matched Events ({activeMatches.length})
            </h2>
          </div>

          {/* Grid View Second */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeMatches.map(match => {
              const registeredCount = match.registrations?.length || 0
              const isUserRegistered = user
                ? match.registrations?.some((r: any) => r.profile_id === user.id)
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
  )
}
