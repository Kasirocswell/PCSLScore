'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createClubAction(formData: FormData) {
  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const zipCode = formData.get('zip_code') as string
  const description = formData.get('description') as string

  if (!name || name.trim() === '') {
    return { error: 'Club name is required' }
  }
  if (!location || location.trim() === '') {
    return { error: 'Location is required' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'director') {
      return { error: 'Only Match Directors are authorized to create clubs' }
    }

    const { error: insertError } = await supabase
      .from('clubs')
      .insert({
        name: name.trim(),
        location: location.trim(),
        zip_code: zipCode?.trim() || null,
        description: description?.trim() || null,
        created_by: user.id
      })

    if (insertError) {
      return { error: insertError.message }
    }

    revalidatePath('/dashboard/clubs')
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

export async function updateClubAction(clubId: string, formData: FormData) {
  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const zipCode = formData.get('zip_code') as string
  const description = formData.get('description') as string

  if (!name || name.trim() === '') {
    return { error: 'Club name is required' }
  }
  if (!location || location.trim() === '') {
    return { error: 'Location is required' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'director') {
      return { error: 'Only Match Directors are authorized to modify clubs' }
    }

    // Ownership check
    const { data: club, error: fetchError } = await supabase
      .from('clubs')
      .select('created_by')
      .eq('id', clubId)
      .single()

    if (fetchError || !club) {
      return { error: 'Club not found' }
    }

    if (club.created_by !== user.id) {
      return { error: 'You are not authorized to edit this club' }
    }

    const { error: updateError } = await supabase
      .from('clubs')
      .update({
        name: name.trim(),
        location: location.trim(),
        zip_code: zipCode?.trim() || null,
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', clubId)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath('/dashboard/clubs')
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}

export async function deleteClubAction(clubId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'director') {
      return { error: 'Only Match Directors are authorized to delete clubs' }
    }

    // Ownership check
    const { data: club, error: fetchError } = await supabase
      .from('clubs')
      .select('created_by')
      .eq('id', clubId)
      .single()

    if (fetchError || !club) {
      return { error: 'Club not found' }
    }

    if (club.created_by !== user.id) {
      return { error: 'You are not authorized to delete this club' }
    }

    const { error: deleteError } = await supabase
      .from('clubs')
      .delete()
      .eq('id', clubId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    revalidatePath('/dashboard/clubs')
    return { success: true }
  } catch (err: any) {
    return { error: err?.message || 'An unexpected error occurred' }
  }
}
