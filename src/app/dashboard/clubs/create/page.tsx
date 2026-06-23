import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CreateClubForm from './CreateClubForm'

export const metadata = {
  title: 'Create Shooting Club | PCSL Score',
  description: 'Form a new shooting club to host official Practical Competition Shooting League matches.',
}

export default async function CreateClubPage() {
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

  // Double-check role in the backend
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'director') {
    redirect('/dashboard')
  }

  return <CreateClubForm />
}
