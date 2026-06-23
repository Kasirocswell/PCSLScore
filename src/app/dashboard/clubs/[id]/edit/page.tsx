import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import EditClubForm from './EditClubForm'

export const metadata = {
  title: 'Edit Club | PCSL Score',
  description: 'Update your shooting club information or delete the club configuration.',
}

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default async function EditClubPage({ params }: EditPageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

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

  // Check user role in database
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'director') {
    redirect('/dashboard')
  }

  // Fetch the club details
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', id)
    .single()

  if (clubError || !club) {
    redirect('/dashboard/clubs')
  }

  // Double-check ownership
  if (club.created_by !== user.id) {
    redirect('/dashboard/clubs')
  }

  return <EditClubForm club={club} />
}
