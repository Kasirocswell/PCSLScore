import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ScorekeepingConsole from './ScorekeepingConsole'

export const revalidate = 0 // Disable caching, dynamic real-time scoring data

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: `Digital Scorekeeper | PCSL Score`,
    description: `Mobile-optimized Range Officer scorekeeping console.`,
  }
}

export default async function MatchScorePage({ params }: Props) {
  const { id: matchId } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // 2. Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'director') {
    redirect(`/matches/${matchId}`)
  }

  // 3. Fetch match details with nested stages, targets, squads, and registrations
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      match_type,
      created_by,
      stages (
        id,
        name,
        stage_number,
        description,
        required_hits_per_paper_target,
        required_hits_per_steel_target,
        max_points,
        targets (
          id,
          target_name,
          target_type,
          required_hits
        )
      ),
      squads (
        id,
        name,
        max_capacity
      ),
      registrations (
        id,
        profile_id,
        division,
        payment_status,
        squad_id,
        profiles (
          id,
          full_name,
          email
        )
      )
    `)
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    notFound()
  }

  // 4. Security Check: Verify user owns this match
  if (match.created_by !== user.id) {
    redirect(`/matches/${matchId}`)
  }

  // 5. Fetch all existing stage runs and their nested target scores for this match's stages
  const stageIds = match.stages?.map((s: any) => s.id) || []
  let stageRuns: any[] = []

  if (stageIds.length > 0) {
    const { data: runsData, error: runsError } = await supabase
      .from('stage_runs')
      .select(`
        id,
        registration_id,
        stage_id,
        time,
        procedural_penalties,
        is_dq,
        is_dnf,
        target_scores (
          id,
          target_id,
          hits_t,
          hits_a,
          hits_c,
          hits_d,
          hits_m,
          hits_ns
        )
      `)
      .in('stage_id', stageIds)

    if (!runsError && runsData) {
      stageRuns = runsData
    }
  }

  // Sort stages by stage_number
  if (match.stages) {
    match.stages.sort((a: any, b: any) => a.stage_number - b.stage_number)
    
    // Sort stage targets alphanumeric (T1, T2, T10, S1)
    match.stages.forEach((stage: any) => {
      if (stage.targets) {
        stage.targets.sort((a: any, b: any) => 
          a.target_name.localeCompare(b.target_name, undefined, { numeric: true, sensitivity: 'base' })
        )
      }
    })
  }

  // Sort squads alphanumeric
  if (match.squads) {
    match.squads.sort((a: any, b: any) => 
      a.name.localeCompare(b.name, undefined, { numeric: true })
    )
  }

  // Sort registrations by competitor name
  if (match.registrations) {
    match.registrations.sort((a: any, b: any) => {
      const nameA = a.profiles?.full_name || a.profiles?.email || ''
      const nameB = b.profiles?.full_name || b.profiles?.email || ''
      return nameA.localeCompare(nameB)
    })
  }

  return (
    <ScorekeepingConsole
      match={match as any}
      stageRuns={stageRuns}
      currentUser={profile}
    />
  )
}
