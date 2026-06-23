import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import MatchRegistrationClient from './MatchRegistrationClient'

export const revalidate = 0 // Dynamic SSR page

export default async function MatchDetailRoute({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Retrieve authenticated user (if any)
  const { data: { user } } = await supabase.auth.getUser()

  let userProfile = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', user.id)
      .single()
    userProfile = profile
  }

  // Fetch full match details with nested relations
  const { data: match, error } = await supabase
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
        location
      ),
      stages (
        id,
        name,
        stage_number,
        description,
        stage_plan_url,
        required_hits_per_paper_target,
        required_hits_per_steel_target,
        max_points
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
    .eq('id', id)
    .single()

  if (error || !match) {
    return notFound()
  }

  // Security: block non-owners from seeing unpublished matches
  if (!match.is_published) {
    if (!user || match.created_by !== user.id) {
      return redirect('/matches')
    }
  }

  return (
    <MatchRegistrationClient
      match={match as any}
      currentUser={userProfile}
    />
  )
}
