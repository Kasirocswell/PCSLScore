import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import MatchWorkspace from './MatchWorkspace'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: `Manage Match | PCSL Score`,
    description: `Match management workspace for designing stages and managing squads.`,
  }
}

export default async function ManageMatchPage({ params }: Props) {
  const { id: matchId } = await params
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

  // Fetch match details with all stages, targets, and squads
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      *,
      clubs ( id, name ),
      stages (
        id,
        name,
        stage_number,
        description,
        stage_plan_url,
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
      )
    `)
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    redirect('/matches/manage')
  }

  // Security check: Verify match belongs to this Match Director
  if (match.created_by !== user.id) {
    redirect('/matches/manage')
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

  return <MatchWorkspace match={match as any} />
}
