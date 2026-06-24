'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Trophy,
  Target,
  Flame,
  Clock,
  ShieldAlert,
  Award,
  BookOpen,
  TrendingUp,
  Table,
  Layers,
  Sparkles,
  ChevronRight,
  MapPin,
  Calendar,
  Building2
} from 'lucide-react'

interface Stage {
  id: string
  name: string
  stage_number: number
  max_points: number
}

interface Profile {
  id: string
  full_name: string | null
  email: string
}

interface Registration {
  id: string
  division: string
  squad_id: string | null
  profiles: Profile | null
  classification?: 'GM' | 'M' | 'A' | 'B' | 'C' | 'D' | 'U'
  average_percentage?: number
}


interface RunScore {
  stage_run_id: string
  registration_id: string
  stage_id: string
  time: number
  procedural_penalties: number
  is_dq: boolean
  is_dnf: boolean
  raw_points: number
  procedural_points: number
  total_stage_points: number
  hit_factor: number
}

interface Squad {
  id: string
  name: string
}

interface LeaderboardClientProps {
  match: {
    id: string
    name: string
    match_type: string
    date: string
    location: string
    is_published: boolean
    clubs: { id: string; name: string; location: string } | null
  }
  stages: Stage[]
  registrations: Registration[]
  runScores: RunScore[]
  squads: Squad[]
}

const getClassificationBadgeStyles = (cls: string) => {
  switch (cls) {
    case 'GM':
      return 'bg-gradient-to-r from-red-600 to-amber-500 text-white border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse'
    case 'M':
      return 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white border border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
    case 'A':
      return 'bg-blue-600 text-white border border-blue-400'
    case 'B':
      return 'bg-emerald-600 text-white border border-emerald-400'
    case 'C':
      return 'bg-slate-500 text-white border border-slate-400'
    case 'D':
      return 'bg-amber-700 text-white border border-amber-500'
    default:
      return 'bg-slate-800 text-slate-400 border border-slate-700'
  }
}

export default function LeaderboardClient({
  match,
  stages,
  registrations,
  runScores,
  squads
}: LeaderboardClientProps) {
  // Tabs: 'standings' | 'stages' | 'matrix'
  const [activeTab, setActiveTab] = useState<'standings' | 'stages' | 'matrix'>('standings')
  
  // Filters
  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [selectedClassification, setSelectedClassification] = useState<string>('all')
  const [selectedStageId, setSelectedStageId] = useState<string>(stages.length > 0 ? stages[0].id : '')


  // Available unique divisions in this match
  const divisions = useMemo(() => {
    const set = new Set<string>()
    registrations.forEach(r => set.add(r.division))
    return Array.from(set).sort()
  }, [registrations])

  // Map squad name by squad_id
  const squadMap = useMemo(() => {
    const map = new Map<string, string>()
    squads.forEach(s => map.set(s.id, s.name))
    return map
  }, [squads])

  // Map registration by registration_id
  const regMap = useMemo(() => {
    const map = new Map<string, Registration>()
    registrations.forEach(r => map.set(r.id, r))
    return map
  }, [registrations])

  // Identify shooters with overall DQ (if a shooter has a DQ on ANY stage, they are DQ'd for the match)
  const dqCompetitorsSet = useMemo(() => {
    const dqs = new Set<string>()
    runScores.forEach(run => {
      if (run.is_dq) {
        dqs.add(run.registration_id)
      }
    })
    return dqs
  }, [runScores])

  // ----------------------------------------------------
  // MATH MODULE: Calculate PCSL Match Hit Factor Standings
  // ----------------------------------------------------
  const scoringData = useMemo(() => {
    // 1. Group runs by stage and division (or overall if division === 'all')
    // Map: stageId -> division -> maxHitFactor
    const stageWinnerHFs: Record<string, Record<string, number>> = {}

    // First pass: find max hit factor for each stage and division
    stages.forEach(stage => {
      stageWinnerHFs[stage.id] = {}
      
      // We initialize max hit factors for 'all' and each unique division
      stageWinnerHFs[stage.id]['all'] = 0
      divisions.forEach(div => {
        stageWinnerHFs[stage.id][div] = 0
      })

      // Query runs for this stage
      const stageRuns = runScores.filter(run => run.stage_id === stage.id)

      stageRuns.forEach(run => {
        const reg = regMap.get(run.registration_id)
        if (!reg) return

        // Skip if competitor is overall DQ'd or DNF on this stage
        const isDqOverall = dqCompetitorsSet.has(run.registration_id)
        if (isDqOverall || run.is_dq || run.is_dnf) return

        const hf = run.hit_factor || 0

        // Check overall max
        if (hf > stageWinnerHFs[stage.id]['all']) {
          stageWinnerHFs[stage.id]['all'] = hf
        }

        // Check division max
        const div = reg.division
        if (hf > (stageWinnerHFs[stage.id][div] || 0)) {
          stageWinnerHFs[stage.id][div] = hf
        }
      })
    })

    // 2. Compute individual stage points and aggregate them
    // Map: registration_id -> { stagePoints: Record<stageId, number>, totalPoints: number }
    const competitorTotals: Record<string, { stagePoints: Record<string, number>; stagePercentages: Record<string, number>; totalPoints: number }> = {}

    registrations.forEach(reg => {
      competitorTotals[reg.id] = {
        stagePoints: {},
        stagePercentages: {},
        totalPoints: 0
      }
      stages.forEach(stage => {
        competitorTotals[reg.id].stagePoints[stage.id] = 0
        competitorTotals[reg.id].stagePercentages[stage.id] = 0
      })
    })

    // Loop through stages to calculate points earned
    stages.forEach(stage => {
      const stageRuns = runScores.filter(run => run.stage_id === stage.id)

      stageRuns.forEach(run => {
        const reg = regMap.get(run.registration_id)
        if (!reg) return

        // Skip if disqualified overall
        const isDqOverall = dqCompetitorsSet.has(run.registration_id)
        if (isDqOverall || run.is_dq || run.is_dnf) {
          competitorTotals[run.registration_id].stagePoints[stage.id] = 0
          competitorTotals[run.registration_id].stagePercentages[stage.id] = 0
          return
        }

        const hf = run.hit_factor || 0

        // Overall division winner max
        const overallWinnerHf = stageWinnerHFs[stage.id]['all']
        // Division winner max
        const divisionWinnerHf = stageWinnerHFs[stage.id][reg.division] || 0

        // We compute standard division standings and overall standings
        // Let's store two points sets if we want. To keep it clean, we'll calculate
        // dynamically based on the CURRENT selected division filter!
        // If selectedDivision === 'all', we rank using overallWinnerHf.
        // If selectedDivision !== 'all', we rank using divisionWinnerHf.
      })
    })

    return { stageWinnerHFs }
  }, [stages, runScores, registrations, divisions, dqCompetitorsSet, regMap])

  // Process standings based on current filters (selectedDivision)
  const processedStandings = useMemo(() => {
    const divisionFilter = selectedDivision

    // 1. Calculate points earned on each stage for each competitor using the appropriate max hit factor
    const list = registrations.map(reg => {
      const isDq = dqCompetitorsSet.has(reg.id)
      const stagePointsBreakdown: Record<string, number> = {}
      const stagePercentagesBreakdown: Record<string, number> = {}
      let totalMatchPoints = 0

      stages.forEach(stage => {
        const run = runScores.find(r => r.registration_id === reg.id && r.stage_id === stage.id)
        
        if (isDq || !run || run.is_dq || run.is_dnf || run.time <= 0) {
          stagePointsBreakdown[stage.id] = 0
          stagePercentagesBreakdown[stage.id] = 0
          return
        }

        const compHF = run.hit_factor || 0
        const winnerHF = scoringData.stageWinnerHFs[stage.id][divisionFilter === 'all' ? 'all' : reg.division] || 0

        let points = 0
        let percent = 0
        if (winnerHF > 0) {
          points = (compHF / winnerHF) * stage.max_points
          percent = (compHF / winnerHF) * 100
        }

        stagePointsBreakdown[stage.id] = parseFloat(points.toFixed(4))
        stagePercentagesBreakdown[stage.id] = parseFloat(percent.toFixed(2))
        totalMatchPoints += points
      })

      return {
        registrationId: reg.id,
        competitor: reg,
        isDq,
        stagePoints: stagePointsBreakdown,
        stagePercentages: stagePercentagesBreakdown,
        totalPoints: isDq ? 0 : parseFloat(totalMatchPoints.toFixed(4))
      }
    })

    // 2. Filter list by division and classification
    const filteredList = list.filter(item => {
      const matchDivision = divisionFilter === 'all' || item.competitor.division === divisionFilter
      const matchClass = selectedClassification === 'all' || (item.competitor.classification || 'U') === selectedClassification
      return matchDivision && matchClass
    })

    // 3. Sort list: Non-DQs first (sorted by total points descending), DQs at the very bottom
    filteredList.sort((a, b) => {
      if (a.isDq && !b.isDq) return 1
      if (!a.isDq && b.isDq) return -1
      if (a.isDq && b.isDq) return 0
      return b.totalPoints - a.totalPoints
    })

    // 4. Calculate relative match percentages
    const divisionWinnerPoints = filteredList.length > 0 && !filteredList[0].isDq ? filteredList[0].totalPoints : 0

    const standingsWithPerc = filteredList.map((item, index) => {
      let relativePercentage = 0
      if (!item.isDq && divisionWinnerPoints > 0) {
        relativePercentage = parseFloat(((item.totalPoints / divisionWinnerPoints) * 100).toFixed(2))
      }

      return {
        ...item,
        rank: item.isDq ? 'DQ' : index + 1,
        matchPercentage: relativePercentage
      }
    })

    return standingsWithPerc
  }, [selectedDivision, selectedClassification, registrations, stages, runScores, scoringData, dqCompetitorsSet])


  // Detailed stage standings for the 'Stages' tab
  const stageStandings = useMemo(() => {
    if (!selectedStageId) return []

    const stage = stages.find(s => s.id === selectedStageId)
    if (!stage) return []

    const divisionFilter = selectedDivision

    // Get runs on this stage
    const runs = runScores.filter(r => r.stage_id === selectedStageId)

    const list = registrations
      .filter(reg => {
        const matchDivision = divisionFilter === 'all' || reg.division === divisionFilter
        const matchClass = selectedClassification === 'all' || (reg.classification || 'U') === selectedClassification
        return matchDivision && matchClass
      })
      .map(reg => {
        const run = runs.find(r => r.registration_id === reg.id)
        const isDqOverall = dqCompetitorsSet.has(reg.id)

        return {
          registrationId: reg.id,
          competitor: reg,
          run,
          isDq: isDqOverall || (run ? run.is_dq : false),
          isDnf: run ? run.is_dnf : false,
          time: run ? run.time : 0,
          proceduralPenalties: run ? run.procedural_penalties : 0,
          rawPoints: run ? run.raw_points : 0,
          proceduralPoints: run ? run.procedural_points : 0,
          totalPoints: run ? run.total_stage_points : 0,
          hitFactor: run ? run.hit_factor : 0
        }
      })

    // Find the max hit factor amongst non-DQ / non-DNF shooters for this stage and division
    const maxHF = scoringData.stageWinnerHFs[selectedStageId][divisionFilter === 'all' ? 'all' : divisionFilter] || 0

    // Compute stage points earned
    const standingWithPoints = list.map(item => {
      let stagePointsEarned = 0
      let stagePercent = 0

      if (!item.isDq && !item.isDnf && maxHF > 0 && item.hitFactor > 0) {
        stagePointsEarned = (item.hitFactor / maxHF) * stage.max_points
        stagePercent = (item.hitFactor / maxHF) * 100
      }

      return {
        ...item,
        stagePoints: parseFloat(stagePointsEarned.toFixed(4)),
        stagePercent: parseFloat(stagePercent.toFixed(2))
      }
    })

    // Sort: Non-DQ / Non-DNF first by Hit Factor descending, DNFs, DQs
    standingWithPoints.sort((a, b) => {
      if (a.isDq && !b.isDq) return 1
      if (!a.isDq && b.isDq) return -1
      if (a.isDq && b.isDq) return 0

      if (a.isDnf && !b.isDnf) return 1
      if (!a.isDnf && b.isDnf) return -1
      if (a.isDnf && b.isDnf) return 0

      return b.hitFactor - a.hitFactor
    })

    return standingWithPoints.map((item, index) => ({
      ...item,
      rank: item.isDq ? 'DQ' : item.isDnf ? 'DNF' : index + 1
    }))
  }, [selectedStageId, selectedDivision, selectedClassification, stages, registrations, runScores, dqCompetitorsSet, scoringData])


  // Total points available in this match
  const totalMatchMaxPoints = useMemo(() => {
    return stages.reduce((sum, s) => sum + s.max_points, 0)
  }, [stages])

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      {/* Header Banner */}
      <header className="bg-slate-900 border-b border-slate-800 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Link
              href={`/matches/${match.id}`}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Match Page
            </Link>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {match.name} Leaderboard
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-cyan-400/80" /> {match.clubs?.name || 'Local Club'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400/80" /> {match.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400/80" /> {new Date(match.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stages</span>
              <p className="text-md font-bold font-mono text-cyan-400 mt-0.5">{stages.length}</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shooters</span>
              <p className="text-md font-bold font-mono text-emerald-400 mt-0.5">{registrations.length}</p>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Match Pts</span>
              <p className="text-md font-bold font-mono text-white mt-0.5">{totalMatchMaxPoints}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-8 flex flex-col gap-6">

        {/* Filters and Tab Navigation bar */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Navigation tabs */}
          <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'standings'
                  ? 'bg-gradient-to-r from-cyan-500/10 to-slate-800 text-cyan-400 font-black border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Match Standings
            </button>
            <button
              onClick={() => setActiveTab('stages')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'stages'
                  ? 'bg-gradient-to-r from-cyan-500/10 to-slate-800 text-cyan-400 font-black border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              Stage Breakdowns
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'matrix'
                  ? 'bg-gradient-to-r from-cyan-500/10 to-slate-800 text-cyan-400 font-black border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Results Matrix
            </button>
          </div>

          {/* Core Controls */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Division Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Division:
              </span>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="all">All Divisions (Combined)</option>
                {divisions.map(div => (
                  <option key={div} value={div}>
                    {div} Only
                  </option>
                ))}
              </select>
            </div>

            {/* Classification Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-purple-400" /> Class:
              </span>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="all">All Classes</option>
                <option value="GM">GM (Grand Master)</option>
                <option value="M">M (Master)</option>
                <option value="A">A Class</option>
                <option value="B">B Class</option>
                <option value="C">C Class</option>
                <option value="D">D Class</option>
                <option value="U">U (Unclassified)</option>
              </select>
            </div>


            {/* Dynamic Stage Filter (Only visible on 'Stages' tab) */}
            {activeTab === 'stages' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Stage:
                </span>
                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      Stage {stage.stage_number}: {stage.name} (Max {stage.max_points} Pts)
                    </option>
                  ))}
                </select>
              </div>
            )}

          </div>
        </section>

        {/* RENDER ACTIVE TAB VIEW */}

        {/* 1. MATCH STANDINGS TAB */}
        {activeTab === 'standings' && (
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs font-bold">
                    <th className="py-3.5 px-4 font-mono w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4">Competitor</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Division</th>
                    <th className="py-3.5 px-4 hidden md:table-cell text-center font-mono w-24">Squad</th>
                    <th className="py-3.5 px-4 text-right font-mono w-40">Match Pts</th>
                    <th className="py-3.5 px-4 text-right w-44">Percent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {processedStandings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                        No competitor registrations available for this match.
                      </td>
                    </tr>
                  ) : (
                    processedStandings.map((item, index) => {
                      const compName = item.competitor.profiles?.full_name || item.competitor.profiles?.email || 'Unknown'
                      const squadName = item.competitor.squad_id ? squadMap.get(item.competitor.squad_id) : 'Unassigned'
                      const isWinner = item.rank === 1

                      return (
                        <tr
                          key={item.registrationId}
                          className={`hover:bg-slate-900/60 transition group ${
                            isWinner ? 'bg-emerald-950/10 border-l-2 border-l-emerald-500' : ''
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-4 px-4 text-center font-mono font-black text-sm">
                            {isWinner ? (
                              <span className="inline-flex items-center justify-center p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                <Trophy className="w-4 h-4" />
                              </span>
                            ) : item.isDq ? (
                              <span className="text-xs bg-red-950/40 border border-red-500/30 text-red-400 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                                DQ
                              </span>
                            ) : (
                              item.rank
                            )}
                          </td>

                          {/* Competitor Name */}
                          <td className="py-4 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span className="block group-hover:text-cyan-400 transition">{compName}</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${getClassificationBadgeStyles(item.competitor.classification || 'U')}`}>
                                {item.competitor.classification || 'U'}
                              </span>
                            </div>
                            <span className="sm:hidden text-[10px] text-slate-500 font-medium font-mono block mt-0.5 uppercase">
                              {item.competitor.division} • Squad {squadName}
                            </span>
                          </td>

                          {/* Division */}
                          <td className="py-4 px-4 hidden sm:table-cell">
                            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-medium font-mono uppercase">
                              {item.competitor.division}
                            </span>
                          </td>

                          {/* Squad */}
                          <td className="py-4 px-4 hidden md:table-cell text-center text-slate-400 font-mono text-xs">
                            {squadName}
                          </td>

                          {/* Total Points */}
                          <td className="py-4 px-4 text-right font-mono text-sm font-bold text-slate-200">
                            {item.totalPoints.toFixed(4)}
                            <span className="text-[10px] text-slate-500 block font-normal">of {totalMatchMaxPoints} pts</span>
                          </td>

                          {/* Relative Match Percentage */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`font-black font-mono text-sm ${isWinner ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {item.isDq ? '0.00' : item.matchPercentage.toFixed(2)}%
                              </span>
                              <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isWinner 
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                      : 'bg-cyan-500'
                                  }`}
                                  style={{ width: `${item.isDq ? 0 : item.matchPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. STAGE Results TAB */}
        {activeTab === 'stages' && (
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs font-bold">
                    <th className="py-3.5 px-4 font-mono w-16 text-center">Rank</th>
                    <th className="py-3.5 px-4">Competitor</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell text-center">Time</th>
                    <th className="py-3.5 px-4 hidden md:table-cell text-center">Points</th>
                    <th className="py-3.5 px-4 hidden md:table-cell text-center">Penalties</th>
                    <th className="py-3.5 px-4 text-center font-mono w-28">Hit Factor</th>
                    <th className="py-3.5 px-4 text-right font-mono w-32">Stage Pts</th>
                    <th className="py-3.5 px-4 text-right w-28">Percent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {stageStandings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500 text-sm">
                        No stage scores available matching your filters.
                      </td>
                    </tr>
                  ) : (
                    stageStandings.map((item, index) => {
                      const compName = item.competitor.profiles?.full_name || item.competitor.profiles?.email || 'Unknown'
                      const isWinner = item.rank === 1

                      return (
                        <tr
                          key={item.registrationId}
                          className={`hover:bg-slate-900/60 transition ${
                            isWinner ? 'bg-cyan-950/10 border-l-2 border-l-cyan-500' : ''
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-4 px-4 text-center font-mono font-black text-sm">
                            {isWinner ? (
                              <span className="inline-flex items-center justify-center p-1 bg-cyan-500/10 text-cyan-400 rounded-lg">
                                <Trophy className="w-3.5 h-3.5" />
                              </span>
                            ) : item.isDq ? (
                              <span className="text-[10px] bg-red-950/40 border border-red-500/30 text-red-400 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                                DQ
                              </span>
                            ) : item.isDnf ? (
                              <span className="text-[10px] bg-amber-950/40 border border-amber-500/30 text-amber-400 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                                DNF
                              </span>
                            ) : !item.run ? (
                              <span className="text-[10px] text-slate-600">
                                NYS
                              </span>
                            ) : (
                              item.rank
                            )}
                          </td>

                          {/* Shooter */}
                          <td className="py-4 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{compName}</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${getClassificationBadgeStyles(item.competitor.classification || 'U')}`}>
                                {item.competitor.classification || 'U'}
                              </span>
                            </div>
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5 uppercase sm:hidden">
                              {item.competitor.division} • HF: {item.isDq || item.isDnf ? '0.0000' : item.hitFactor.toFixed(4)}
                            </span>
                          </td>


                          {/* Time */}
                          <td className="py-4 px-4 hidden sm:table-cell text-center font-mono text-sm text-slate-300">
                            {item.isDq || item.isDnf || !item.run ? '-' : `${item.time.toFixed(2)}s`}
                          </td>

                          {/* Points */}
                          <td className="py-4 px-4 hidden md:table-cell text-center font-mono text-xs text-slate-300">
                            {item.isDq || item.isDnf || !item.run ? '-' : `${item.rawPoints} pts`}
                          </td>

                          {/* Procedurals */}
                          <td className="py-4 px-4 hidden md:table-cell text-center font-mono text-xs">
                            {item.proceduralPenalties > 0 ? (
                              <span className="text-red-400">-{item.proceduralPoints} pts</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          {/* Hit Factor */}
                          <td className="py-4 px-4 text-center font-mono font-black text-sm text-cyan-400">
                            {item.isDq || item.isDnf || !item.run ? '0.0000' : item.hitFactor.toFixed(4)}
                          </td>

                          {/* Stage Points Earned */}
                          <td className="py-4 px-4 text-right font-mono text-sm font-bold text-slate-200">
                            {item.stagePoints.toFixed(4)}
                          </td>

                          {/* Percentage */}
                          <td className="py-4 px-4 text-right font-black font-mono text-sm text-slate-300">
                            {item.stagePercent.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. COMPETITOR MATRIX TAB */}
        {activeTab === 'matrix' && (
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs font-bold">
                    <th className="py-3.5 px-4">Competitor</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Division</th>
                    {stages.map(stage => (
                      <th key={stage.id} className="py-3.5 px-4 text-center font-mono text-xs font-bold whitespace-nowrap">
                        St. {stage.stage_number}
                      </th>
                    ))}
                    <th className="py-3.5 px-4 text-right font-mono text-xs font-black">Total Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {processedStandings.length === 0 ? (
                    <tr>
                      <td colSpan={stages.length + 3} className="text-center py-12 text-slate-500 text-sm">
                        No competitor scores available.
                      </td>
                    </tr>
                  ) : (
                    processedStandings.map(item => {
                      const compName = item.competitor.profiles?.full_name || item.competitor.profiles?.email || 'Unknown'
                      const isDq = item.isDq

                      return (
                        <tr key={item.registrationId} className="hover:bg-slate-900/60 transition">
                          {/* Competitor */}
                          <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{compName}</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${getClassificationBadgeStyles(item.competitor.classification || 'U')}`}>
                                {item.competitor.classification || 'U'}
                              </span>
                            </div>
                          </td>


                          {/* Division */}
                          <td className="py-4 px-4 hidden sm:table-cell whitespace-nowrap">
                            <span className="text-xs bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-medium font-mono uppercase">
                              {item.competitor.division}
                            </span>
                          </td>

                          {/* Stages cell list */}
                          {stages.map(stage => {
                            const run = runScores.find(r => r.registration_id === item.registrationId && r.stage_id === stage.id)
                            const hf = run ? (run.is_dq || run.is_dnf ? 0 : run.hit_factor) : null
                            const percent = item.stagePercentages[stage.id] || 0

                            return (
                              <td key={stage.id} className="py-4 px-4 text-center">
                                {isDq || (run && run.is_dq) ? (
                                  <span className="text-[10px] font-mono font-bold text-red-500 uppercase bg-red-950/20 px-1 py-0.5 rounded">
                                    DQ
                                  </span>
                                ) : run && run.is_dnf ? (
                                  <span className="text-[10px] font-mono font-bold text-amber-500 uppercase bg-amber-950/20 px-1 py-0.5 rounded">
                                    DNF
                                  </span>
                                ) : hf !== null ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs font-mono font-bold text-cyan-400">{hf.toFixed(4)}</span>
                                    <span className="text-[10px] font-mono text-slate-500 mt-0.5">({percent.toFixed(0)}%)</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-600 font-mono">-</span>
                                )}
                              </td>
                            )
                          })}

                          {/* Total points */}
                          <td className="py-4 px-4 text-right font-mono font-black text-sm text-emerald-400 whitespace-nowrap">
                            {isDq ? (
                              <span className="text-xs text-red-500 font-bold uppercase">DQ</span>
                            ) : (
                              item.totalPoints.toFixed(4)
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
