import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { 
  Trophy, 
  Calendar, 
  Target, 
  ArrowLeft, 
  TrendingUp, 
  Activity, 
  Clock, 
  Zap, 
  Sparkles, 
  Gauge, 
  Award,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

export const revalidate = 0 // Dynamic SSR page

export default async function ShooterScoresPage() {
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

  // 1. Fetch shooter registrations
  const { data: regs, error: regsErr } = await supabase
    .from('registrations')
    .select(`
      id,
      division,
      matches (
        id,
        name,
        date,
        location,
        match_type
      )
    `)
    .eq('profile_id', user.id)

  const registrations = regs || []

  if (registrations.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 flex flex-col justify-center items-center text-center">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-md space-y-6 relative z-10">
          <div className="w-16 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">No Match Scores Recorded</h1>
            <p className="text-sm text-slate-400">
              You haven&apos;t registered for any Practical Competition Shooting League (PCSL) matches yet. Sign up, shoot a match, and range officers will log your scores to unlock visual analytics here!
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-500/10 cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>Find Upcoming Matches</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const registrationIds = registrations.map(r => r.id)

  // 2. Fetch computed stage run scores from our view
  const { data: runScores } = await supabase
    .from('view_stage_run_scores')
    .select(`
      stage_run_id,
      registration_id,
      stage_id,
      time,
      procedural_penalties,
      is_dq,
      is_dnf,
      raw_points,
      procedural_points,
      total_stage_points,
      hit_factor
    `)
    .in('registration_id', registrationIds)

  const scores = runScores || []

  // 3. Fetch detailed target-level hit counts
  const { data: runsWithTargets } = await supabase
    .from('stage_runs')
    .select(`
      id,
      registration_id,
      stage_id,
      stages (
        name,
        stage_number,
        max_points
      ),
      target_scores (
        hits_t,
        hits_a,
        hits_c,
        hits_d,
        hits_m,
        hits_ns
      )
    `)
    .in('registration_id', registrationIds)

  const targetRuns = runsWithTargets || []

  // --- SCORE AGGREGATION & DATA COMPILATION ---
  let totalT = 0
  let totalA = 0
  let totalC = 0
  let totalD = 0
  let totalM = 0
  let totalNS = 0

  let totalRawPoints = 0
  let totalPenalties = 0
  let totalEarnedPoints = 0
  let totalTime = 0
  let totalCompletedRuns = 0
  let totalDQs = 0
  let totalDNFs = 0
  
  // Group runs by registration (match)
  const matchPerformanceMap: { [regId: string]: any } = {}

  registrations.forEach(reg => {
    matchPerformanceMap[reg.id] = {
      match: reg.matches,
      division: reg.division,
      runs: [],
      matchEarnedPoints: 0,
      matchTime: 0,
      matchHitFactors: [],
      isDq: false
    }
  })

  targetRuns.forEach(tr => {
    const scoreVal = scores.find(s => s.registration_id === tr.registration_id && s.stage_id === tr.stage_id)
    if (!scoreVal) return

    // Tally hits
    const tsList = tr.target_scores || []
    tsList.forEach((ts: any) => {
      totalT += (ts.hits_t || 0)
      totalA += (ts.hits_a || 0)
      totalC += (ts.hits_c || 0)
      totalD += (ts.hits_d || 0)
      totalM += (ts.hits_m || 0)
      totalNS += (ts.hits_ns || 0)
    })

    const isDq = scoreVal.is_dq || false
    const isDnf = scoreVal.is_dnf || false

    if (isDq) {
      totalDQs++
      if (matchPerformanceMap[tr.registration_id]) {
        matchPerformanceMap[tr.registration_id].isDq = true
      }
    }
    if (isDnf) totalDNFs++

    if (!isDq && !isDnf) {
      totalCompletedRuns++
      totalRawPoints += (scoreVal.raw_points || 0)
      totalPenalties += (scoreVal.procedural_points || 0)
      totalEarnedPoints += (scoreVal.total_stage_points || 0)
      totalTime += (scoreVal.time || 0)
    }

    // Save into match mapping
    if (matchPerformanceMap[tr.registration_id]) {
      matchPerformanceMap[tr.registration_id].runs.push({
        stage: tr.stages,
        score: scoreVal,
        hits: tsList
      })

      if (!isDq && !isDnf) {
        matchPerformanceMap[tr.registration_id].matchEarnedPoints += (scoreVal.total_stage_points || 0)
        matchPerformanceMap[tr.registration_id].matchTime += (scoreVal.time || 0)
        matchPerformanceMap[tr.registration_id].matchHitFactors.push(Number(scoreVal.hit_factor || 0))
      }
    }
  })

  // Convert map to sorted array
  const matchesList = Object.values(matchPerformanceMap)
    .filter((m: any) => m.runs.length > 0)
    .sort((a: any, b: any) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime())

  // Compute aggregate variables
  const hitZonesSum = (totalT * 2) + totalA + totalC + totalD + totalM
  const hitRatioT = hitZonesSum > 0 ? (totalT / hitZonesSum) * 100 : 0
  const hitRatioA = hitZonesSum > 0 ? (totalA / hitZonesSum) * 100 : 0
  const hitRatioC = hitZonesSum > 0 ? (totalC / hitZonesSum) * 100 : 0
  const hitRatioD = hitZonesSum > 0 ? (totalD / hitZonesSum) * 100 : 0
  const hitRatioM = hitZonesSum > 0 ? (totalM / hitZonesSum) * 100 : 0

  const avgMatchHitFactor = totalTime > 0 ? totalEarnedPoints / totalTime : 0

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 relative">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-indigo-400 shrink-0" />
                Shooter Performance Console
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Deep-dive score breakdowns, hit-zone distributions, and progression analytics.
              </p>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Real-time rulebook data synced
            </div>
          </div>
        </div>

        {/* SUMMARY STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Matches Shot */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Matches Shot</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-white">{matchesList.length}</span>
              <span className="text-xs text-indigo-400 font-semibold">Events</span>
            </div>
          </div>

          {/* Average Hit Factor */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Points Per Second (PPS)</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-emerald-400">{avgMatchHitFactor.toFixed(3)}</span>
              <span className="text-xs text-slate-400 font-medium">Pts/Sec</span>
            </div>
          </div>

          {/* Hit-to-Miss Ratio */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Accuracy Index</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-indigo-400">
                {totalM === 0 ? 'Perfect' : ((totalT + totalA) / Math.max(1, totalM)).toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 font-medium">{totalM === 0 ? 'No Mikes' : 'Hits/Mike'}</span>
            </div>
          </div>

          {/* Accuracy Score */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Points Earned</span>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-3xl font-extrabold text-white">{totalEarnedPoints}</span>
              <span className="text-xs text-slate-400 font-medium">Of {totalRawPoints} Raw</span>
            </div>
          </div>

        </div>

        {/* VISUAL ACCURACY RATIO DISPLAY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Accuracy Pill breakdown */}
          <div className="lg:col-span-1 backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                Accuracy Profile (Hit Ratios)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Distribution of hit zones recorded across all stages completed.
              </p>
            </div>

            {hitZonesSum > 0 ? (
              <div className="space-y-4">
                {/* Visual Stacked bar */}
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-white/5 border border-white/5 shadow-inner">
                  {totalT > 0 && <div style={{ width: `${hitRatioT}%` }} className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full" title={`T-Zone (Tango): ${totalT}`} />}
                  {totalA > 0 && <div style={{ width: `${hitRatioA}%` }} className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full" title={`Alpha: ${totalA}`} />}
                  {totalC > 0 && <div style={{ width: `${hitRatioC}%` }} className="bg-gradient-to-r from-amber-400 to-orange-500 h-full" title={`Charlie: ${totalC}`} />}
                  {totalD > 0 && <div style={{ width: `${hitRatioD}%` }} className="bg-gradient-to-r from-slate-400 to-slate-500 h-full" title={`Delta: ${totalD}`} />}
                  {totalM > 0 && <div style={{ width: `${hitRatioM}%` }} className="bg-gradient-to-r from-rose-500 to-red-600 h-full" title={`Mike (Miss): ${totalM}`} />}
                </div>

                {/* Legend list */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  {/* T-Zone */}
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-cyan-400 to-blue-500 inline-block" />
                      T-Zone (10pt)
                    </span>
                    <strong className="text-white mt-1.5 font-extrabold">{totalT} <span className="text-[10px] text-slate-500 font-normal">({hitRatioT.toFixed(1)}%)</span></strong>
                  </div>

                  {/* Alpha */}
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-emerald-400 to-teal-500 inline-block" />
                      Alpha (5pt)
                    </span>
                    <strong className="text-white mt-1.5 font-extrabold">{totalA} <span className="text-[10px] text-slate-500 font-normal">({hitRatioA.toFixed(1)}%)</span></strong>
                  </div>

                  {/* Charlie */}
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-amber-400 to-orange-500 inline-block" />
                      Charlie (3pt)
                    </span>
                    <strong className="text-white mt-1.5 font-extrabold">{totalC} <span className="text-[10px] text-slate-500 font-normal">({hitRatioC.toFixed(1)}%)</span></strong>
                  </div>

                  {/* Delta */}
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-slate-400 to-slate-500 inline-block" />
                      Delta (1pt)
                    </span>
                    <strong className="text-white mt-1.5 font-extrabold">{totalD} <span className="text-[10px] text-slate-500 font-normal">({hitRatioD.toFixed(1)}%)</span></strong>
                  </div>

                  {/* Mike */}
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-rose-500 to-red-600 inline-block" />
                      Mike (-10pt)
                    </span>
                    <strong className="text-white mt-1.5 font-extrabold">{totalM} <span className="text-[10px] text-slate-500 font-normal">({hitRatioM.toFixed(1)}%)</span></strong>
                  </div>

                  {/* No-Shoots */}
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-fuchsia-400 to-purple-600 inline-block animate-pulse" />
                      No-Shoot (-10pt)
                    </span>
                    <strong className="text-white mt-1.5 font-extrabold">{totalNS} Hits</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">
                No target score hits logged. Completing a stage will render accuracy ratios instantly.
              </div>
            )}
          </div>

          {/* Right Chronological Matches List & Expandable stages scores */}
          <div className="lg:col-span-2 backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-400" />
                Match History & Stage Details ({matchesList.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your performance, times, and Hit Factors categorized by match events.
              </p>
            </div>

            <div className="space-y-6">
              {matchesList.map((m: any, idx) => {
                const totalRunsCount = m.runs.length
                const averageHF = m.matchHitFactors.length > 0
                  ? m.matchHitFactors.reduce((a: number, b: number) => a + b, 0) / m.matchHitFactors.length
                  : 0

                return (
                  <div 
                    key={m.match.id}
                    className="rounded-xl border border-white/5 overflow-hidden bg-white/2 animate-fadeIn"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {/* Header banner */}
                    <div className="bg-white/5 px-5 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">{m.match.name}</h3>
                          {m.isDq && (
                            <span className="text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                              DQ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(m.match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-medium text-[10px]">
                            {m.division}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-500">Average Match Hit Factor</span>
                        <strong className="text-sm font-extrabold text-indigo-400">{averageHF.toFixed(4)}</strong>
                      </div>
                    </div>

                    {/* Stages table */}
                    <div className="divide-y divide-white/5">
                      {m.runs.map((run: any) => {
                        const scoreData = run.score
                        const stageData = run.stage
                        const runDq = scoreData.is_dq || false
                        const runDnf = scoreData.is_dnf || false

                        return (
                          <div 
                            key={run.stage.id}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/2 transition-all"
                          >
                            <div className="space-y-1 flex-1">
                              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                                <span className="text-slate-500">Stage {stageData.stage_number}:</span>
                                {stageData.name}
                              </h4>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  {runDq || runDnf ? '—' : `${scoreData.time}s`}
                                </span>
                                <span>
                                  Points: <strong className="text-white">{runDq || runDnf ? '0' : scoreData.total_stage_points}</strong> of {stageData.max_points || '—'}
                                </span>
                                {scoreData.procedural_penalties > 0 && (
                                  <span className="text-rose-400">
                                    {scoreData.procedural_penalties} Penalty ({scoreData.procedural_points}pts)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Scoring indicators */}
                            <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                              {/* Hits quick pills */}
                              <div className="flex items-center gap-1 text-[9px] font-bold">
                                {run.hits.map((ts: any, tsIdx: number) => {
                                  const tHits = ts.hits_t || 0
                                  const aHits = ts.hits_a || 0
                                  const cHits = ts.hits_c || 0
                                  const dHits = ts.hits_d || 0
                                  const mHits = ts.hits_m || 0
                                  const nsHits = ts.hits_ns || 0

                                  return (
                                    <div key={tsIdx} className="flex gap-1">
                                      {tHits > 0 && <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1 rounded">{tHits}T</span>}
                                      {aHits > 0 && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded">{aHits}A</span>}
                                      {cHits > 0 && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded">{cHits}C</span>}
                                      {dHits > 0 && <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-1 rounded">{dHits}D</span>}
                                      {mHits > 0 && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 rounded">{mHits}M</span>}
                                      {nsHits > 0 && <span className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-1 rounded animate-pulse">{nsHits}NS</span>}
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="text-right min-w-[90px]">
                                {runDq ? (
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 rounded">DQ</span>
                                ) : runDnf ? (
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded">DNF</span>
                                ) : (
                                  <>
                                    <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-500">Hit Factor</span>
                                    <strong className="text-xs font-black text-emerald-400">{Number(scoreData.hit_factor || 0).toFixed(4)}</strong>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
