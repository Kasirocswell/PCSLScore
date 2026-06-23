'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { stripe } from '@/utils/stripe'
import { headers } from 'next/headers'

// Recalculates the max points of a stage based on its targets
async function recalculateStageMaxPoints(supabase: any, stageId: string) {
  const { data: targets, error: targetsError } = await supabase
    .from('targets')
    .select('target_type, required_hits')
    .eq('stage_id', stageId)

  if (targetsError || !targets) return

  let maxPoints = 0
  for (const target of targets) {
    if (target.target_type === 'paper') {
      // Best case under PCSL Rule 11.3: ceil(H / 2) T-Zone hits, each worth 10 pts
      maxPoints += Math.ceil(target.required_hits / 2) * 10
    } else if (target.target_type === 'steel' || target.target_type === 'frangible') {
      // 5 points per required hit
      maxPoints += target.required_hits * 5
    }
  }

  await supabase
    .from('stages')
    .update({ max_points: maxPoints })
    .eq('id', stageId)
}

// Helper to verify that the current user is a director and owns the club (for Match creation)
async function verifyClubDirector(clubId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check Profile role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'director') {
    throw new Error('Access denied: Match Director role required')
  }

  // Check Club Ownership
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('created_by')
    .eq('id', clubId)
    .single()

  if (clubError || !club) {
    throw new Error('Club not found')
  }

  if (club.created_by !== user.id) {
    throw new Error('Access denied: You do not own this shooting club')
  }

  return { user, supabase }
}

// Helper to verify that the current user is a director and owns the match
async function verifyMatchDirector(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check Profile role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'director') {
    throw new Error('Access denied: Match Director role required')
  }

  // Check Match Ownership
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('created_by')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    throw new Error('Match not found')
  }

  if (match.created_by !== user.id) {
    throw new Error('Access denied: You do not own this match')
  }

  return { user, supabase }
}

// 1. CREATE MATCH
export async function createMatchAction(formData: FormData) {
  try {
    const club_id = formData.get('club_id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const date = formData.get('date') as string
    const location = formData.get('location') as string
    const match_type = formData.get('match_type') as string
    const payment_required = formData.get('payment_required') === 'true'
    const priceRaw = formData.get('price') as string
    const price = payment_required ? parseFloat(priceRaw || '0') : 0.00
    const is_published = formData.get('is_published') === 'true'

    if (!club_id) return { error: 'Shooting club is required' }
    if (!name || name.trim() === '') return { error: 'Match name is required' }
    if (!date) return { error: 'Match date is required' }
    if (!location || location.trim() === '') return { error: 'Location is required' }
    if (!match_type) return { error: 'Match type is required' }
    if (payment_required && (isNaN(price) || price < 0)) {
      return { error: 'A valid registration price is required' }
    }

    const { user, supabase } = await verifyClubDirector(club_id)

    // Enforce active subscription checking
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('subscription_active')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.subscription_active) {
      return { error: 'An active Match Director subscription ($10/month) is required to create a match.' }
    }

    const { data: match, error: insertError } = await supabase
      .from('matches')
      .insert({
        club_id,
        name: name.trim(),
        description: description?.trim() || null,
        date,
        location: location.trim(),
        match_type,
        payment_required,
        price,
        is_published,
        created_by: user.id
      })
      .select('id')
      .single()

    if (insertError) {
      return { error: insertError.message }
    }

    revalidatePath('/matches/manage')
    revalidatePath('/dashboard')

    return { success: true, matchId: match.id }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 2. UPDATE MATCH
export async function updateMatchAction(matchId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const date = formData.get('date') as string
    const location = formData.get('location') as string
    const match_type = formData.get('match_type') as string
    const payment_required = formData.get('payment_required') === 'true'
    const priceRaw = formData.get('price') as string
    const price = payment_required ? parseFloat(priceRaw || '0') : 0.00
    const is_published = formData.get('is_published') === 'true'

    if (!name || name.trim() === '') return { error: 'Match name is required' }
    if (!date) return { error: 'Match date is required' }
    if (!location || location.trim() === '') return { error: 'Location is required' }
    if (!match_type) return { error: 'Match type is required' }
    if (payment_required && (isNaN(price) || price < 0)) {
      return { error: 'A valid registration price is required' }
    }

    const { supabase } = await verifyMatchDirector(matchId)

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        date,
        location: location.trim(),
        match_type,
        payment_required,
        price,
        is_published,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath(`/matches/${matchId}/manage`)
    revalidatePath('/matches/manage')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 3. CREATE STAGE
export async function createStageAction(matchId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string
    const stage_number_raw = formData.get('stage_number') as string
    const description = formData.get('description') as string
    const required_hits_per_paper_target_raw = formData.get('required_hits_per_paper_target') as string
    const required_hits_per_steel_target_raw = formData.get('required_hits_per_steel_target') as string

    const stage_number = parseInt(stage_number_raw, 10)
    const required_hits_per_paper_target = parseInt(required_hits_per_paper_target_raw || '2', 10)
    const required_hits_per_steel_target = parseInt(required_hits_per_steel_target_raw || '1', 10)

    if (!name || name.trim() === '') return { error: 'Stage name is required' }
    if (isNaN(stage_number) || stage_number <= 0) return { error: 'Valid stage number is required' }
    if (isNaN(required_hits_per_paper_target) || required_hits_per_paper_target <= 0) {
      return { error: 'Required paper target hits must be greater than 0' }
    }
    if (isNaN(required_hits_per_steel_target) || required_hits_per_steel_target <= 0) {
      return { error: 'Required steel target hits must be greater than 0' }
    }

    const { supabase } = await verifyMatchDirector(matchId)

    // Check for duplicate stage number in the match
    const { data: existingStages } = await supabase
      .from('stages')
      .select('id')
      .eq('match_id', matchId)
      .eq('stage_number', stage_number)

    if (existingStages && existingStages.length > 0) {
      return { error: `Stage number ${stage_number} already exists in this match` }
    }

    const { data: stage, error: insertError } = await supabase
      .from('stages')
      .insert({
        match_id: matchId,
        name: name.trim(),
        stage_number,
        description: description?.trim() || null,
        required_hits_per_paper_target,
        required_hits_per_steel_target,
        max_points: 0
      })
      .select()
      .single()

    if (insertError) {
      return { error: insertError.message }
    }

    revalidatePath(`/matches/${matchId}/manage`)
    return { success: true, stage }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 4. UPDATE STAGE
export async function updateStageAction(matchId: string, stageId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string
    const stage_number_raw = formData.get('stage_number') as string
    const description = formData.get('description') as string
    const required_hits_per_paper_target_raw = formData.get('required_hits_per_paper_target') as string
    const required_hits_per_steel_target_raw = formData.get('required_hits_per_steel_target') as string

    const stage_number = parseInt(stage_number_raw, 10)
    const required_hits_per_paper_target = parseInt(required_hits_per_paper_target_raw || '2', 10)
    const required_hits_per_steel_target = parseInt(required_hits_per_steel_target_raw || '1', 10)

    if (!name || name.trim() === '') return { error: 'Stage name is required' }
    if (isNaN(stage_number) || stage_number <= 0) return { error: 'Valid stage number is required' }
    if (isNaN(required_hits_per_paper_target) || required_hits_per_paper_target <= 0) {
      return { error: 'Required paper target hits must be greater than 0' }
    }
    if (isNaN(required_hits_per_steel_target) || required_hits_per_steel_target <= 0) {
      return { error: 'Required steel target hits must be greater than 0' }
    }

    const { supabase } = await verifyMatchDirector(matchId)

    // Check duplicate stage number excluding current stage
    const { data: dupStages } = await supabase
      .from('stages')
      .select('id')
      .eq('match_id', matchId)
      .eq('stage_number', stage_number)
      .neq('id', stageId)

    if (dupStages && dupStages.length > 0) {
      return { error: `Another stage already uses number ${stage_number}` }
    }

    const { error: updateError } = await supabase
      .from('stages')
      .update({
        name: name.trim(),
        stage_number,
        description: description?.trim() || null,
        required_hits_per_paper_target,
        required_hits_per_steel_target
      })
      .eq('id', stageId)

    if (updateError) {
      return { error: updateError.message }
    }

    // Since default required hits might have changed, recalculate max points
    await recalculateStageMaxPoints(supabase, stageId)

    revalidatePath(`/matches/${matchId}/manage`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 5. DELETE STAGE
export async function deleteStageAction(matchId: string, stageId: string) {
  try {
    const { supabase } = await verifyMatchDirector(matchId)

    const { error: deleteError } = await supabase
      .from('stages')
      .delete()
      .eq('id', stageId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    revalidatePath(`/matches/${matchId}/manage`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 6. ADD TARGET TO STAGE
export async function addTargetAction(matchId: string, stageId: string, formData: FormData) {
  try {
    const target_name = formData.get('target_name') as string
    const target_type = formData.get('target_type') as string
    const required_hits_raw = formData.get('required_hits') as string

    if (!target_name || target_name.trim() === '') return { error: 'Target name (e.g. T1) is required' }
    if (!target_type || !['paper', 'steel', 'frangible', 'no-shoot'].includes(target_type)) {
      return { error: 'Invalid target type' }
    }

    const required_hits = parseInt(required_hits_raw, 10)
    if (isNaN(required_hits) || required_hits < 0) {
      return { error: 'Required hits must be 0 or greater' }
    }

    const { supabase } = await verifyMatchDirector(matchId)

    // Check duplicate target name in the stage
    const { data: existingTargets } = await supabase
      .from('targets')
      .select('id')
      .eq('stage_id', stageId)
      .eq('target_name', target_name.trim().toUpperCase())

    if (existingTargets && existingTargets.length > 0) {
      return { error: `Target named "${target_name.trim().toUpperCase()}" already exists on this stage` }
    }

    const { error: insertError } = await supabase
      .from('targets')
      .insert({
        stage_id: stageId,
        target_name: target_name.trim().toUpperCase(),
        target_type,
        required_hits
      })

    if (insertError) {
      return { error: insertError.message }
    }

    // Recalculate stage's max points
    await recalculateStageMaxPoints(supabase, stageId)

    revalidatePath(`/matches/${matchId}/manage`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 7. DELETE TARGET FROM STAGE
export async function deleteTargetAction(matchId: string, stageId: string, targetId: string) {
  try {
    const { supabase } = await verifyMatchDirector(matchId)

    const { error: deleteError } = await supabase
      .from('targets')
      .delete()
      .eq('id', targetId)
      .eq('stage_id', stageId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    // Recalculate stage's max points
    await recalculateStageMaxPoints(supabase, stageId)

    revalidatePath(`/matches/${matchId}/manage`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 8. CREATE SQUAD
export async function createSquadAction(matchId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string
    const max_capacity_raw = formData.get('max_capacity') as string

    if (!name || name.trim() === '') return { error: 'Squad name is required' }
    const max_capacity = parseInt(max_capacity_raw, 10)
    if (isNaN(max_capacity) || max_capacity <= 0) {
      return { error: 'Max capacity must be a positive number' }
    }

    const { supabase } = await verifyMatchDirector(matchId)

    const { error: insertError } = await supabase
      .from('squads')
      .insert({
        match_id: matchId,
        name: name.trim(),
        max_capacity
      })

    if (insertError) {
      return { error: insertError.message }
    }

    revalidatePath(`/matches/${matchId}/manage`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 9. DELETE SQUAD
export async function deleteSquadAction(matchId: string, squadId: string) {
  try {
    const { supabase } = await verifyMatchDirector(matchId)

    // Check if squad has registered competitors
    const { data: registrants, error: checkError } = await supabase
      .from('registrations')
      .select('id')
      .eq('squad_id', squadId)

    if (registrants && registrants.length > 0) {
      return { error: 'Cannot delete squad: competitors are currently assigned to it' }
    }

    const { error: deleteError } = await supabase
      .from('squads')
      .delete()
      .eq('id', squadId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    revalidatePath(`/matches/${matchId}/manage`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 10. AUTHENTICATED USER HELPER
async function verifyAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }
  return { user, supabase }
}

// 11. REGISTER FOR MATCH
export async function registerForMatchAction(matchId: string, division: string) {
  try {
    const { user, supabase } = await verifyAuthenticatedUser()

    if (!division || division.trim() === '') {
      return { error: 'Division selection is required' }
    }

    // Retrieve match details to check pricing
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('payment_required, price')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return { error: 'Match not found' }
    }

    const payment_status = (match.payment_required && match.price > 0) ? 'pending' : 'free'

    const { data, error: insertError } = await supabase
      .from('registrations')
      .insert({
        match_id: matchId,
        profile_id: user.id,
        division: division.trim(),
        payment_status
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return { error: 'You are already registered for this match' }
      }
      return { error: insertError.message }
    }

    revalidatePath(`/matches/${matchId}`)
    return { success: true, registration: data }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 12. JOIN/CHANGE SQUAD
export async function joinSquadAction(matchId: string, squadId: string | null) {
  try {
    const { user, supabase } = await verifyAuthenticatedUser()

    // Find user's registration
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('id, payment_status')
      .eq('match_id', matchId)
      .eq('profile_id', user.id)
      .single()

    if (regError || !registration) {
      return { error: 'You must register for the match before squadding' }
    }

    // Get match pricing config
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('payment_required')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return { error: 'Match not found' }
    }

    // Enforce prepayment rule
    if (match.payment_required && registration.payment_status === 'pending' && squadId !== null) {
      return { error: 'Payment required to squad: Please pay the match entry fee first' }
    }

    // If joining a squad, verify capacity
    if (squadId) {
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select('id, max_capacity')
        .eq('id', squadId)
        .eq('match_id', matchId)
        .single()

      if (squadError || !squad) {
        return { error: 'Squad not found or does not belong to this match' }
      }

      // Count existing members
      const { count, error: countError } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .eq('squad_id', squadId)

      if (countError) {
        return { error: 'Error checking squad capacity' }
      }

      const currentCount = count || 0
      if (currentCount >= squad.max_capacity) {
        return { error: 'This squad is full. Please select another squad.' }
      }
    }

    // Update squad_id
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ squad_id: squadId })
      .eq('id', registration.id)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath(`/matches/${matchId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 13. SIMULATE REGISTRATION ENTRY FEE PAYMENT
export async function simulatePaymentAction(matchId: string) {
  try {
    const { user, supabase } = await verifyAuthenticatedUser()

    // Find registration
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('id')
      .eq('match_id', matchId)
      .eq('profile_id', user.id)
      .single()

    if (regError || !registration) {
      return { error: 'Registration not found' }
    }

    // Mark as paid
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ payment_status: 'paid', payment_intent_id: 'sim_' + Math.random().toString(36).substring(2, 10) })
      .eq('id', registration.id)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath(`/matches/${matchId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 14. SAVE STAGE RUN SCORE (Digital Scorekeeper)
export async function saveStageRunScoreAction(
  matchId: string,
  registrationId: string,
  stageId: string,
  time: number,
  proceduralPenalties: number,
  targetScores: {
    target_id: string
    hits_t: number
    hits_a: number
    hits_c: number
    hits_d: number
    hits_m: number
    hits_ns: number
  }[],
  isDq: boolean = false,
  isDnf: boolean = false
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Verify match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('created_by')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return { error: 'Match not found' }
    }

    if (!isDq && !isDnf && (isNaN(time) || time <= 0)) {
      return { error: 'A valid stage run time is required' }
    }

    if (isNaN(proceduralPenalties) || proceduralPenalties < 0) {
      return { error: 'Procedural penalties must be 0 or greater' }
    }

    // Insert or update stage run
    const { data: stageRun, error: stageRunError } = await supabase
      .from('stage_runs')
      .upsert({
        registration_id: registrationId,
        stage_id: stageId,
        time: isDq || isDnf ? 0.0000 : time,
        procedural_penalties: proceduralPenalties,
        is_dq: isDq,
        is_dnf: isDnf,
        scorekeeper_id: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'registration_id,stage_id'
      })
      .select('id')
      .single()

    if (stageRunError || !stageRun) {
      return { error: stageRunError?.message || 'Failed to record stage run' }
    }

    const stageRunId = stageRun.id

    // Insert or update individual target scores
    for (const score of targetScores) {
      const { error: tsError } = await supabase
        .from('target_scores')
        .upsert({
          stage_run_id: stageRunId,
          target_id: score.target_id,
          hits_t: score.hits_t,
          hits_a: score.hits_a,
          hits_c: score.hits_c,
          hits_d: score.hits_d,
          hits_m: score.hits_m,
          hits_ns: score.hits_ns
        }, {
          onConflict: 'stage_run_id,target_id'
        })

      if (tsError) {
        return { error: `Failed to save score for target: ${tsError.message}` }
      }
    }

    revalidatePath(`/matches/${matchId}/score`)
    revalidatePath(`/matches/${matchId}/manage`)
    revalidatePath(`/matches/${matchId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

// 15. CREATE STRIPE CHECKOUT SESSION FOR MATCH DIRECTOR SUBSCRIPTION
export async function createSubscriptionSessionAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Verify user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'director') {
      return { error: 'Match Director account required for subscription.' }
    }

    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') || 'http'
    const origin = `${proto}://${host}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'PCSL Match Director Subscription',
              description: 'Unlimited match creation, stages scoring, and club administration.',
            },
            unit_amount: 1000, // $10.00
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dashboard?subscription=cancel`,
      metadata: {
        type: 'director_subscription',
        profile_id: user.id,
      },
    })

    return { success: true, url: session.url }
  } catch (err: any) {
    console.error('Failed to create subscription checkout session:', err.message)
    return { error: err?.message || 'Failed to create subscription session' }
  }
}

// 16. CREATE STRIPE CHECKOUT SESSION FOR COMPETITOR ENTRY PREPAYMENT
export async function createMatchPaymentSessionAction(matchId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Verify competitor registration exists
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('id, division, payment_status')
      .eq('match_id', matchId)
      .eq('profile_id', user.id)
      .single()

    if (regError || !registration) {
      return { error: 'Registration not found' }
    }

    if (registration.payment_status === 'paid') {
      return { error: 'You have already paid for this match.' }
    }

    // Load match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('name, price, payment_required')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return { error: 'Match details not found' }
    }

    if (!match.payment_required || match.price <= 0) {
      return { error: 'No prepayment is required for this match.' }
    }

    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') || 'http'
    const origin = `${proto}://${host}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Match Entry Fee: ${match.name}`,
              description: `Division: ${registration.division}`,
            },
            unit_amount: Math.round(match.price * 100), // convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/matches/${matchId}?payment=success`,
      cancel_url: `${origin}/matches/${matchId}?payment=cancel`,
      metadata: {
        type: 'match_registration_payment',
        match_id: matchId,
        registration_id: registration.id,
        profile_id: user.id,
      },
    })

    return { success: true, url: session.url }
  } catch (err: any) {
    console.error('Failed to create match payment checkout session:', err.message)
    return { error: err?.message || 'Failed to initialize entry fee payment' }
  }
}
