'use server'

import { createClient } from '@/utils/supabase/server'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const accountType = formData.get('accountType') as string

  if (!email || !password || !accountType) {
    return { error: 'All fields are required' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: accountType,
        role: accountType, // Added to match the db handle_new_user trigger
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
