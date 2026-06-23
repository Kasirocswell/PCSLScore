import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import LeaderboardClient from './LeaderboardClient'

export const revalidate = 0 // Leaderboards are real-time, no cache

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: `Live Match Leaderboard | PCSL Score`,
    description: `Real-time scoring standouts, stage percentage breakdowns, and official rankings.`,
  }
}

export default async function MatchLeaderboardPage({ params }: Props) {
  const { id: matchId } = await params
  const supabase = await createClient()

  // 1. Fetch match details
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      match_type,
      date,
      location,
      is_published,
      created_by,
      clubs (
        id,
        name,
        location
      )
    `)
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    notFound()
  }

  // Security Check: If match is unpublished, only the creator can see it
  const { data: { user } } = await supabase.auth.getUser()
  if (!match.is_published) {
    if (!user || match.created_by !== user.id) {
      notFound() // Render notFound if unauthorized to avoid leaking unpublished match existence
    }
  }

  // 2. Fetch all stages in the match (sorted)
  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select('id, name, stage_number, max_points')
    .eq('match_id', matchId)
    .order('stage_number', { ascending: true })

  if (stagesError || !stages) {
    notFound()
  }

  // 3. Fetch all competitor registrations with profile info
  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select(`
      id,
      division,
      squad_id,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('match_id', matchId)

  if (regError || !registrations) {
    notFound()
  }

  // 4. Fetch all computed runs from view_stage_run_scores
  const stageIds = stages.map(s => s.id)
  let runScores: any[] = []

  if (stageIds.length > 0) {
    const { data: scoresData, error: scoresError } = await supabase
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
      .in('stage_id', stageIds)

    if (!scoresError && scoresData) {
      runScores = scoresData
    }
  }

  // Fetch squads list for reference in leaderboard
  const { data: squads } = await supabase
    .from('squads')
    .select('id, name')
    .eq('match_id', matchId)

  return (
    <LeaderboardClient
      match={match as any}
      stages={stages as any}
      registrations={registrations as any}
      runScores={runScores}
      squads={squads || []}
    />
  )
}
