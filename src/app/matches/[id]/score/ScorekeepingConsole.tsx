'use client'

import React, { useState, useTransition, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveStageRunScoreAction } from '../../actions'
import {
  ArrowLeft,
  Save,
  Plus,
  Minus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Flame,
  RotateCcw,
  Sparkles,
  Users,
  Target,
  Clock,
  ShieldAlert,
  ChevronRight,
  Search,
  Check,
  UserCheck
} from 'lucide-react'

// Local scorekeeping types
interface Target {
  id: string
  target_name: string
  target_type: 'paper' | 'steel' | 'frangible' | 'no-shoot'
  required_hits: number
}

interface Stage {
  id: string
  name: string
  stage_number: number
  description: string | null
  required_hits_per_paper_target: number
  required_hits_per_steel_target: number
  max_points: number
  targets: Target[] | null
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
  match_type: string
  created_by: string
  stages: Stage[] | null
  squads: Squad[] | null
  registrations: Registration[] | null
}

interface TargetScoreState {
  hits_t: number
  hits_a: number
  hits_c: number
  hits_d: number
  hits_m: number
  hits_ns: number
}

interface ScorekeepingConsoleProps {
  match: MatchDetails
  stageRuns: any[]
  currentUser: { id: string; full_name: string | null; email: string; role: string }
}

// Client side implementation of the official PCSL Rule 11.3 scoring
function calculateTargetScoreLocal(
  targetType: string,
  requiredHits: number,
  hits_t: number,
  hits_a: number,
  hits_c: number,
  hits_d: number,
  hits_m: number,
  hits_ns: number,
  excludeUnsatisfiedMisses: boolean = false
): number {
  // If no hits of any kind are logged, return 0 as the default unscored state
  const totalRawHits = (hits_t || 0) + (hits_a || 0) + (hits_c || 0) + (hits_d || 0) + (hits_m || 0) + (hits_ns || 0)
  if (totalRawHits === 0) {
    return 0
  }

  let score = 0
  let needed = requiredHits
  let t_avail = hits_t || 0
  let a_avail = hits_a || 0
  let c_avail = hits_c || 0
  let d_avail = hits_d || 0
  const ns_penalty = (hits_ns || 0) * -10

  if (targetType === 'no-shoot') {
    return ns_penalty
  }

  // Steel / Frangible Target scoring (5 points per hit, up to required_hits)
  if (targetType === 'steel' || targetType === 'frangible') {
    if (a_avail > 0) {
      const hitsToScore = Math.min(a_avail, requiredHits)
      score = 5 * hitsToScore
      needed -= hitsToScore
    }
    if (needed > 0 && !excludeUnsatisfiedMisses) {
      score -= (needed * 10) // Remaining needed hits are misses
    }
    return score + ns_penalty
  }

  // Paper Target Scoring
  // 1. T-Zone (Tango) hits first: each worth 10 points and counts as 2 hits.
  while (needed > 0 && t_avail > 0) {
    if (needed >= 2) {
      score += 10
      needed -= 2
    } else {
      score += 10
      needed = 0
    }
    t_avail -= 1
  }

  // 2. Alpha hits (5 points, counts as 1 hit)
  while (needed > 0 && a_avail > 0) {
    score += 5
    needed -= 1
    a_avail -= 1
  }

  // 3. Charlie hits (3 points, counts as 1 hit)
  while (needed > 0 && c_avail > 0) {
    score += 3
    needed -= 1
    c_avail -= 1
  }

  // 4. Delta hits (1 point, counts as 1 hit)
  while (needed > 0 && d_avail > 0) {
    score += 1
    needed -= 1
    d_avail -= 1
  }

  // remaining unsatisfied hits are counted as Mikes (-10 points per miss)
  if (needed > 0 && !excludeUnsatisfiedMisses) {
    score -= (needed * 10)
  }

  return score + ns_penalty
}

export default function ScorekeepingConsole({
  match,
  stageRuns,
  currentUser
}: ScorekeepingConsoleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Console Settings States
  const [selectedSquadId, setSelectedSquadId] = useState<string>('all')
  const [selectedStageId, setSelectedStageId] = useState<string>(
    match.stages && match.stages.length > 0 ? match.stages[0].id : ''
  )
  const [selectedRegId, setSelectedRegistrationId] = useState<string | null>(null)
  
  // Search state for filtering shooters
  const [competitorSearch, setCompetitorSearch] = useState<string>('')

  // Scoring states
  const [time, setTime] = useState<string>('')
  const [proceduralPenalties, setProceduralPenalties] = useState<number>(0)
  const [isDq, setIsDq] = useState<boolean>(false)
  const [isDnf, setIsDnf] = useState<boolean>(false)

  // Target-level hit inputs: Map from target_id -> TargetScoreState
  const [targetScores, setTargetScores] = useState<Record<string, TargetScoreState>>({})

  // Feedback states
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true)

  // Active stage helper
  const activeStage = useMemo(() => {
    return match.stages?.find(s => s.id === selectedStageId) || null
  }, [match.stages, selectedStageId])

  // Map squad registrations
  const filteredRegistrations = useMemo(() => {
    if (!match.registrations) return []
    return match.registrations.filter(reg => {
      // Squad filter
      const squadMatch = selectedSquadId === 'all' || reg.squad_id === selectedSquadId
      
      // Search filter
      const competitorName = reg.profiles?.full_name?.toLowerCase() || ''
      const competitorEmail = reg.profiles?.email?.toLowerCase() || ''
      const searchMatch = competitorSearch.trim() === '' || 
        competitorName.includes(competitorSearch.toLowerCase()) ||
        competitorEmail.includes(competitorSearch.toLowerCase())

      return squadMatch && searchMatch
    })
  }, [match.registrations, selectedSquadId, competitorSearch])

  // Map existing stage runs in memory for quick lookup
  const runScoreMap = useMemo(() => {
    const map = new Map<string, any>()
    stageRuns.forEach(run => {
      map.set(`${run.registration_id}_${run.stage_id}`, run)
    })
    return map
  }, [stageRuns])

  // Get score status for the current competitors list on the active stage
  const competitorStatuses = useMemo(() => {
    const statusObj: Record<string, { scored: boolean; hitFactor?: number; isDq?: boolean; isDnf?: boolean }> = {}
    if (!match.registrations || !activeStage) return statusObj

    match.registrations.forEach(reg => {
      const key = `${reg.id}_${activeStage.id}`
      const run = runScoreMap.get(key)
      if (run) {
        if (run.is_dq) {
          statusObj[reg.id] = { scored: true, isDq: true }
        } else if (run.is_dnf) {
          statusObj[reg.id] = { scored: true, isDnf: true }
        } else {
          // Compute Hit Factor
          let rawPoints = 0
          if (run.target_scores && activeStage.targets) {
            run.target_scores.forEach((ts: any) => {
              const target = activeStage.targets?.find(t => t.id === ts.target_id)
              if (target) {
                rawPoints += calculateTargetScoreLocal(
                  target.target_type,
                  target.required_hits,
                  ts.hits_t,
                  ts.hits_a,
                  ts.hits_c,
                  ts.hits_d,
                  ts.hits_m,
                  ts.hits_ns
                )
              }
            })
          }
          const totalPoints = Math.max(0, rawPoints - (run.procedural_penalties * 10))
          const hitFactor = run.time > 0 ? parseFloat((totalPoints / run.time).toFixed(4)) : 0.0000
          statusObj[reg.id] = { scored: true, hitFactor }
        }
      } else {
        statusObj[reg.id] = { scored: false }
      }
    })

    return statusObj
  }, [match.registrations, activeStage, runScoreMap])

  // Initialize selected registration if none is chosen yet
  useEffect(() => {
    if (!selectedRegId && filteredRegistrations.length > 0) {
      setSelectedRegistrationId(filteredRegistrations[0].id)
    }
  }, [filteredRegistrations, selectedRegId])

  // Load existing score or reset when competitor or stage changes
  useEffect(() => {
    if (!selectedRegId || !selectedStageId || !activeStage) return

    setSaveSuccess(false)
    setSaveError(null)

    const key = `${selectedRegId}_${selectedStageId}`
    const existingRun = runScoreMap.get(key)

    if (existingRun) {
      // Load existing
      setTime(existingRun.time > 0 ? existingRun.time.toString() : '')
      setProceduralPenalties(existingRun.procedural_penalties)
      setIsDq(existingRun.is_dq)
      setIsDnf(existingRun.is_dnf)

      // Setup target score map
      const initialScores: Record<string, TargetScoreState> = {}
      activeStage.targets?.forEach(target => {
        const scoreRecord = existingRun.target_scores?.find((ts: any) => ts.target_id === target.id)
        if (scoreRecord) {
          initialScores[target.id] = {
            hits_t: scoreRecord.hits_t,
            hits_a: scoreRecord.hits_a,
            hits_c: scoreRecord.hits_c,
            hits_d: scoreRecord.hits_d,
            hits_m: scoreRecord.hits_m,
            hits_ns: scoreRecord.hits_ns
          }
        } else {
          initialScores[target.id] = { hits_t: 0, hits_a: 0, hits_c: 0, hits_d: 0, hits_m: 0, hits_ns: 0 }
        }
      })
      setTargetScores(initialScores)
    } else {
      // Initialize fresh sheet
      setTime('')
      setProceduralPenalties(0)
      setIsDq(false)
      setIsDnf(false)

      const initialScores: Record<string, TargetScoreState> = {}
      activeStage.targets?.forEach(target => {
        initialScores[target.id] = { hits_t: 0, hits_a: 0, hits_c: 0, hits_d: 0, hits_m: 0, hits_ns: 0 }
      })
      setTargetScores(initialScores)
    }
  }, [selectedRegId, selectedStageId, activeStage, runScoreMap])

  // Helper to adjust a hit category for a specific target with validation limits
  const adjustHits = (targetId: string, category: keyof TargetScoreState, amount: number) => {
    setTargetScores(prev => {
      const current = prev[targetId] || { hits_t: 0, hits_a: 0, hits_c: 0, hits_d: 0, hits_m: 0, hits_ns: 0 }
      const newVal = Math.max(0, current[category] + amount)
      return {
        ...prev,
        [targetId]: {
          ...current,
          [category]: newVal
        }
      }
    })
  }

  // Pre-fill helper: Quick Fill All Alphas
  const quickFillAlphas = () => {
    if (!activeStage) return
    const updatedScores: Record<string, TargetScoreState> = { ...targetScores }
    activeStage.targets?.forEach(target => {
      if (target.target_type === 'paper') {
        // Under PCSL: default is Alphas (e.g. 2 required hits = 2 Alphas, or 1 T-Zone which counts as 2 hits)
        // Let's do 2 Alphas as standard clean paper hit
        updatedScores[target.id] = {
          hits_t: 0,
          hits_a: target.required_hits,
          hits_c: 0,
          hits_d: 0,
          hits_m: 0,
          hits_ns: 0
        }
      } else {
        // Steel / Frangible = Hit
        updatedScores[target.id] = {
          hits_t: 0,
          hits_a: target.required_hits,
          hits_c: 0,
          hits_d: 0,
          hits_m: 0,
          hits_ns: 0
        }
      }
    })
    setTargetScores(updatedScores)
  }

  // Reset helper
  const resetTargetScores = () => {
    if (!activeStage) return
    const resetScores: Record<string, TargetScoreState> = {}
    activeStage.targets?.forEach(target => {
      resetScores[target.id] = { hits_t: 0, hits_a: 0, hits_c: 0, hits_d: 0, hits_m: 0, hits_ns: 0 }
    })
    setTargetScores(resetScores)
    setTime('')
    setProceduralPenalties(0)
    setIsDq(false)
    setIsDnf(false)
  }

  // Live Score Calculator for the Summary Panel
  const liveSummary = useMemo(() => {
    if (!activeStage) {
      return {
        rawPoints: 0,
        proceduralPoints: 0,
        noShootPoints: 0,
        missPoints: 0,
        totalPenalties: 0,
        totalPoints: 0,
        hitFactor: 0.0000
      }
    }

    let rawPoints = 0      // Gross points from hits
    let noShootPoints = 0  // No-shoot penalties
    let missPoints = 0     // Miss penalties (explicit and unsatisfied)

    activeStage.targets?.forEach(target => {
      const ts = targetScores[target.id] || { hits_t: 0, hits_a: 0, hits_c: 0, hits_d: 0, hits_m: 0, hits_ns: 0 }
      const totalRawHits = (ts.hits_t || 0) + (ts.hits_a || 0) + (ts.hits_c || 0) + (ts.hits_d || 0) + (ts.hits_m || 0) + (ts.hits_ns || 0)

      if (totalRawHits > 0) {
        // Calculate target's net score (including unsatisfied misses)
        const targetNet = calculateTargetScoreLocal(
          target.target_type,
          target.required_hits,
          ts.hits_t,
          ts.hits_a,
          ts.hits_c,
          ts.hits_d,
          ts.hits_m,
          ts.hits_ns,
          false
        )

        // Calculate target's gross score (excluding unsatisfied misses)
        const targetGrossWithNoShoots = calculateTargetScoreLocal(
          target.target_type,
          target.required_hits,
          ts.hits_t,
          ts.hits_a,
          ts.hits_c,
          ts.hits_d,
          ts.hits_m,
          ts.hits_ns,
          true
        )

        const nsPenalty = (ts.hits_ns || 0) * -10
        const targetGross = targetGrossWithNoShoots - nsPenalty

        rawPoints += targetGross
        noShootPoints += (ts.hits_ns || 0) * 10
        
        // missPenalties = targetGross - targetNet - noShootPenalties
        const targetMissPenalties = targetGross - targetNet - ((ts.hits_ns || 0) * 10)
        missPoints += Math.max(0, targetMissPenalties)
      }
    })

    const proceduralPoints = proceduralPenalties * 10
    const totalPenalties = proceduralPoints + noShootPoints + missPoints
    const totalPoints = Math.max(0, rawPoints - totalPenalties)
    const runTime = parseFloat(time) || 0

    let hitFactor = 0.0000
    if (!isDq && !isDnf && runTime > 0) {
      hitFactor = totalPoints / runTime
    }

    return {
      rawPoints,
      proceduralPoints,
      noShootPoints,
      missPoints,
      totalPenalties,
      totalPoints,
      hitFactor: parseFloat(hitFactor.toFixed(4))
    }
  }, [activeStage, targetScores, proceduralPenalties, time, isDq, isDnf])

  // Active competitor details
  const activeCompetitor = useMemo(() => {
    return match.registrations?.find(r => r.id === selectedRegId) || null
  }, [match.registrations, selectedRegId])

  // Save scoring function
  const handleSaveScore = async () => {
    if (!selectedRegId || !selectedStageId || !activeStage) return
    
    const runTime = parseFloat(time)
    if (!isDq && !isDnf && (isNaN(runTime) || runTime <= 0)) {
      setSaveError('Please enter a valid, positive run time.')
      return
    }

    setSaveError(null)
    setSaveSuccess(false)

    // Pack targets score array
    const targetScoresPayload = Object.entries(targetScores).map(([target_id, scores]) => ({
      target_id,
      ...scores
    }))

    startTransition(async () => {
      const res = await saveStageRunScoreAction(
        match.id,
        selectedRegId,
        selectedStageId,
        isDq || isDnf ? 0.0000 : runTime,
        proceduralPenalties,
        targetScoresPayload,
        isDq,
        isDnf
      )

      if (res && res.error) {
        setSaveError(res.error)
      } else {
        setSaveSuccess(true)
        router.refresh() // Sync cache and fetch newly updated scores
        
        // Auto-advance to the next competitor in the active squad
        if (autoAdvance) {
          const currentIndex = filteredRegistrations.findIndex(r => r.id === selectedRegId)
          if (currentIndex !== -1 && currentIndex < filteredRegistrations.length - 1) {
            // Delay slightly so they see the checkmark transition
            setTimeout(() => {
              setSelectedRegistrationId(filteredRegistrations[currentIndex + 1].id)
            }, 600)
          }
        }
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      {/* Navbar/Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/matches/${match.id}/manage`}
              className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-md sm:text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Digital Scorekeeper
              </h1>
              <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{match.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              RO: {currentUser.full_name || currentUser.email}
            </div>
            <Link
              href={`/matches/${match.id}/scores`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs rounded-lg transition border border-cyan-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Leaderboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Squad & Competitor Selectors (4 Cols) */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
            
            {/* Squad Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Select Squad
              </label>
              <select
                value={selectedSquadId}
                onChange={(e) => {
                  setSelectedSquadId(e.target.value)
                  setSelectedRegistrationId(null) // Reset competitor selection
                }}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="all">All Squads & Unassigned</option>
                {match.squads?.map(squad => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Select Stage
              </label>
              <select
                value={selectedStageId}
                onChange={(e) => {
                  setSelectedStageId(e.target.value)
                }}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                {match.stages?.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    Stage {stage.stage_number}: {stage.name} (Max {stage.max_points} Pts)
                  </option>
                ))}
              </select>
            </div>

            <hr className="border-slate-800/80" />

            {/* Competitor Search & List */}
            <div>
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search competitor..."
                  value={competitorSearch}
                  onChange={(e) => setCompetitorSearch(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 text-white transition"
                />
              </div>

              <div className="max-h-[350px] lg:max-h-[500px] overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-800">
                {filteredRegistrations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No competitors found matching criteria.
                  </div>
                ) : (
                  filteredRegistrations.map(reg => {
                    const status = competitorStatuses[reg.id] || { scored: false }
                    const isSelected = selectedRegId === reg.id
                    const compName = reg.profiles?.full_name || reg.profiles?.email || 'Unknown Shooter'
                    
                    return (
                      <button
                        key={reg.id}
                        onClick={() => setSelectedRegistrationId(reg.id)}
                        className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900 border-cyan-500 text-white ring-1 ring-cyan-500/20'
                            : 'bg-slate-900/30 border-slate-800/60 hover:bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <span className="text-xs font-bold truncate">{compName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.25 rounded text-slate-400 font-medium font-mono">
                              {reg.division}
                            </span>
                            {reg.squad_id && (
                              <span className="text-[10px] text-slate-500">
                                Squad: {match.squads?.find(s => s.id === reg.squad_id)?.name || 'S'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status indicators */}
                        <div>
                          {status.scored ? (
                            status.isDq ? (
                              <span className="text-[10px] bg-red-950/50 border border-red-500/40 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase font-mono">
                                DQ
                              </span>
                            ) : status.isDnf ? (
                              <span className="text-[10px] bg-amber-950/50 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase font-mono">
                                DNF
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full font-bold font-mono flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                {status.hitFactor} HF
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] bg-slate-800/50 text-slate-500 px-2 py-0.5 rounded-full border border-transparent font-medium">
                              Pending
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

          </div>
        </section>

        {/* RIGHT COLUMN: Active Scorecard Area (8 Cols) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {activeCompetitor && activeStage ? (
            <div className="flex flex-col gap-4">
              
              {/* Active Competitor Banner Card */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/20 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-xl text-slate-950 shadow-inner">
                    <UserCheck className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <h2 className="text-md font-bold text-white flex items-center gap-2">
                      {activeCompetitor.profiles?.full_name || activeCompetitor.profiles?.email}
                      <span className="text-xs px-2 py-0.5 bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 rounded font-bold font-mono">
                        {activeCompetitor.division}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <span>Squad: {match.squads?.find(s => s.id === activeCompetitor.squad_id)?.name || 'Unassigned'}</span>
                      <span>•</span>
                      <span>Stage {activeStage.stage_number}: {activeStage.name}</span>
                    </p>
                  </div>
                </div>

                {/* Quick Pre-fill Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={quickFillAlphas}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    title="Logs required Alphas/Hits on every target"
                  >
                    <Flame className="w-3.5 h-3.5 animate-pulse" />
                    Quick Fill Alphas
                  </button>
                  <button
                    onClick={resetTargetScores}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              {/* DNF / DQ Global Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsDnf(prev => !prev)
                    if (!isDnf) setIsDq(false) // Exclusive states
                  }}
                  className={`p-3 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition ${
                    isDnf
                      ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/20'
                      : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  Did Not Finish (DNF)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDq(prev => !prev)
                    if (!isDq) setIsDnf(false) // Exclusive states
                  }}
                  className={`p-3 border rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition ${
                    isDq
                      ? 'bg-red-950/40 border-red-500 text-red-300 shadow-md ring-1 ring-red-500/20'
                      : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  Disqualified (DQ)
                </button>
              </div>

              {/* Main Score Entry Inputs */}
              {!isDq && !isDnf && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Time Entry Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-cyan-400" /> Run Time (Seconds)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white rounded-xl py-3 pl-4 pr-16 text-lg font-bold font-mono focus:outline-none transition shadow-inner"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold font-mono text-sm">
                        SEC
                      </span>
                    </div>
                  </div>

                  {/* Procedural Penalties Stepper */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" /> Procedural Penalties (-10 pts each)
                    </label>
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                      <button
                        type="button"
                        onClick={() => setProceduralPenalties(p => Math.max(0, p - 1))}
                        className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center font-bold text-lg font-mono text-white">
                        {proceduralPenalties}
                      </div>
                      <button
                        type="button"
                        onClick={() => setProceduralPenalties(p => p + 1)}
                        className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Target-by-Target Lists */}
              {!isDq && !isDnf && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-900 pb-2 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-cyan-400" /> Target Scores Breakdown
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeStage.targets && activeStage.targets.length > 0 ? (
                      activeStage.targets.map(target => {
                        const score = targetScores[target.id] || { hits_t: 0, hits_a: 0, hits_c: 0, hits_d: 0, hits_m: 0, hits_ns: 0 }
                        const isPaper = target.target_type === 'paper'
                        const totalRawHits = (score.hits_t || 0) + (score.hits_a || 0) + (score.hits_c || 0) + (score.hits_d || 0) + (score.hits_m || 0) + (score.hits_ns || 0)
                        
                        // Live calculate single target score with unsatisfied misses
                        const targetPoints = calculateTargetScoreLocal(
                          target.target_type,
                          target.required_hits,
                          score.hits_t,
                          score.hits_a,
                          score.hits_c,
                          score.hits_d,
                          score.hits_m,
                          score.hits_ns,
                          false
                        )

                        // Live calculate gross score (excluding unsatisfied misses) for editing feedback
                        const targetGrossPoints = calculateTargetScoreLocal(
                          target.target_type,
                          target.required_hits,
                          score.hits_t,
                          score.hits_a,
                          score.hits_c,
                          score.hits_d,
                          score.hits_m,
                          score.hits_ns,
                          true
                        )

                        // Calculate total shots logged (including explicit Mikes) to see if we met required hits
                        const totalShotsLogged = isPaper 
                          ? (score.hits_t * 2) + score.hits_a + score.hits_c + score.hits_d + score.hits_m
                          : score.hits_a + score.hits_m

                        const isSatisfied = totalShotsLogged >= target.required_hits
                        const isUnderShot = totalShotsLogged < target.required_hits
                        const missingShots = isUnderShot ? Math.max(0, target.required_hits - totalShotsLogged) : 0

                        return (
                          <div
                            key={target.id}
                            className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex flex-col gap-3 shadow-md hover:border-slate-800/80 transition"
                          >
                            {/* Target Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold bg-slate-800/90 px-2.5 py-1 rounded-lg text-white font-mono">
                                  {target.target_name}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                                  target.target_type === 'paper' 
                                    ? 'bg-cyan-950/60 border border-cyan-800/30 text-cyan-400' 
                                    : 'bg-emerald-950/60 border border-emerald-800/30 text-emerald-400'
                                }`}>
                                  {target.target_type}
                                </span>
                              </div>

                              {/* Running single target score */}
                              <div className="flex items-center gap-1.5">
                                {totalRawHits === 0 ? (
                                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-850 border border-transparent text-slate-500">
                                    0 pts
                                  </span>
                                ) : isUnderShot ? (
                                  <>
                                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                      targetGrossPoints > 0 
                                        ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                                        : 'bg-slate-850 border border-transparent text-slate-500'
                                    }`}>
                                      {targetGrossPoints > 0 ? `+${targetGrossPoints}` : targetGrossPoints} pts
                                    </span>
                                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-950/50 border border-red-500/20 text-red-400" title="Missing hit penalty">
                                      -{missingShots * 10} miss
                                    </span>
                                  </>
                                ) : (
                                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                    targetPoints > 0 
                                      ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                                      : targetPoints < 0 
                                        ? 'bg-red-950/40 border border-red-500/20 text-red-400' 
                                        : 'bg-slate-850 border border-transparent text-slate-500'
                                  }`}>
                                    {targetPoints > 0 ? `+${targetPoints}` : targetPoints} pts
                                  </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                                  isSatisfied 
                                    ? 'bg-emerald-950/20 text-emerald-500' 
                                    : 'bg-amber-950/20 text-amber-500'
                                }`}>
                                  Logged: {totalShotsLogged} / {target.required_hits}
                                </span>
                              </div>
                            </div>

                            {/* Scoring Buttons tactile layout */}
                            {isPaper ? (
                              <div className="grid grid-cols-3 gap-2 mt-1.5">
                                {/* T-Zone (Tango): worth 10 points (counts as 2 hits) */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">T-ZONE</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_t', -1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-cyan-400">{score.hits_t}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_t', 1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* A-Zone: worth 5 points */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">ALPHA</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_a', -1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-emerald-400">{score.hits_a}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_a', 1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* C-Zone: worth 3 points */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">CHARLIE</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_c', -1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-amber-500">{score.hits_c}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_c', 1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* D-Zone: worth 1 point */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">DELTA</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_d', -1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-orange-400">{score.hits_d}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_d', 1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Explicit Mikes: -10 points */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">MIKES</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_m', -1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-red-500">{score.hits_m}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_m', 1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* No-Shoots: -10 points per hit */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">NO-SHOOTS</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_ns', -1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-rose-500">{score.hits_ns}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_ns', 1)}
                                      className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Steel / Frangible target tactile layout: simpler hit/miss buttons
                              <div className="grid grid-cols-2 gap-3 mt-1.5">
                                {/* Hits: 5 points each up to required */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">STEEL HITS</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_a', -1)}
                                      className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-emerald-400">{score.hits_a}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_a', 1)}
                                      className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* No shoots */}
                                <div className="flex flex-col gap-1 items-center bg-slate-950/50 border border-slate-850 p-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">NO-SHOOTS</span>
                                  <div className="flex items-center justify-between w-full mt-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_ns', -1)}
                                      className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-sm font-mono text-rose-500">{score.hits_ns}</span>
                                    <button
                                      type="button"
                                      onClick={() => adjustHits(target.id, 'hits_ns', 1)}
                                      className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-lg text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="col-span-2 text-center py-6 bg-slate-900/20 border border-slate-800/80 rounded-xl text-slate-500 text-xs">
                        No targets are defined on this stage. Define targets in Match Workspace.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LIVE TALLY SUMMARY & SAVE CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-5 mt-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -z-10"></div>
                
                <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-850 pb-2">
                  Scoring Summary Tally
                </h3>

                {isDq ? (
                  <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300">
                    <XCircle className="w-8 h-8 text-red-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wide">Competitor Disqualified (DQ)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Competitor is disqualified from this match. A Hit Factor of 0.0000 is logged.</p>
                    </div>
                  </div>
                ) : isDnf ? (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-300">
                    <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wide">Did Not Finish Stage (DNF)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Shooter did not finish this stage. A Hit Factor of 0.0000 is logged.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                    
                    {/* Raw points */}
                    <div className="bg-slate-950 border border-slate-850/60 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Raw Points</p>
                      <p className="text-lg font-bold font-mono text-white mt-1">{liveSummary.rawPoints}</p>
                    </div>

                    {/* Deductions (Penalties & Misses) */}
                    <div className="bg-slate-950 border border-slate-850/60 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Penalties & Misses</p>
                      <p className={`text-lg font-bold font-mono mt-1 ${liveSummary.totalPenalties > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        -{liveSummary.totalPenalties}
                      </p>
                    </div>

                    {/* Total stage points */}
                    <div className="bg-slate-950 border border-slate-850/60 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Total Run Points</p>
                      <p className="text-lg font-bold font-mono text-emerald-400 mt-1">{liveSummary.totalPoints}</p>
                    </div>

                    {/* RUN TIME */}
                    <div className="bg-slate-950 border border-slate-850/60 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Time (Seconds)</p>
                      <p className="text-lg font-bold font-mono text-cyan-400 mt-1">{parseFloat(time) || '0.00'}</p>
                    </div>

                  </div>
                )}

                {/* HIT FACTOR PROMINENT DISPLAY */}
                {!isDq && !isDnf && (
                  <div className="bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Live Estimated Hit Factor</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Total Points divided by Run Time</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black font-mono tracking-wider bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow">
                        {liveSummary.hitFactor.toFixed(4)}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 uppercase">POINTS / SEC</p>
                    </div>
                  </div>
                )}

                {/* Feedbacks */}
                {saveError && (
                  <div className="p-3 bg-red-950/30 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Score saved successfully!</span>
                  </div>
                )}

                {/* Final Action Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-850 pt-4">
                  
                  {/* Auto advance toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={(e) => setAutoAdvance(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-850 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-4.5 h-4.5 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">Auto-Advance</span>
                      <span className="text-[10px] text-slate-500">Selects next shooter automatically upon save</span>
                    </div>
                  </label>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveScore}
                    disabled={isPending}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:from-slate-800 disabled:to-slate-850 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-cyan-500/10 active:scale-95 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        Saving Run Score...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-slate-950" />
                        Save Competitor Run
                      </>
                    )}
                  </button>

                </div>

              </div>

            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Users className="w-12 h-12 text-slate-700 stroke-[1.5]" />
              <div>
                <h3 className="text-md font-bold text-slate-400">No Competitor Selected</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Select a squad, then choose a competitor from the roster on the left to start scoring their runs.
                </p>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
