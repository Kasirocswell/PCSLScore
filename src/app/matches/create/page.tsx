import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CreateMatchForm from './CreateMatchForm'
import { Building2, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Create PCSL Match | PCSL Score',
  description: 'Design and configure a new Practical Competition Shooting League match.',
}

export default async function CreateMatchPage() {
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

  // Fetch all clubs created by this director to see if they can host
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('id, name, location')
    .eq('created_by', user.id)
    .order('name', { ascending: true })

  // If no clubs exist, prompt to create a club first
  if (clubsError || !clubs || clubs.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 flex flex-col justify-center relative overflow-hidden">
        {/* Decorative Glow backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center text-indigo-400 mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              No Shooting Clubs Found
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Every PCSL match must be hosted by a shooting club. You need to create a club before you can build and schedule matches.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <Link
              href="/dashboard/clubs/create"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 active:scale-95 text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Build Your Club First
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <CreateMatchForm clubs={clubs} />
}
