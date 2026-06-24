'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Target, Menu, X, LogOut, Trophy, LayoutDashboard, Calendar, PlusCircle, Settings, User } from 'lucide-react'

interface NavbarProps {
  user: any | null
}

export default function Navbar({ user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const accountType = user?.user_metadata?.account_type || 'shooter'
  const isLoggedIn = !!user

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg hover:opacity-90 transition-opacity">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-500 p-0.5">
                <span className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Target className="w-4 h-4 text-indigo-400" />
                </span>
              </span>
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                PCSL Score
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>

                {accountType === 'director' ? (
                  <>
                    <Link href="/matches/create" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
                      <PlusCircle className="w-4 h-4 text-emerald-400" />
                      Build Match
                    </Link>
                    <Link href="/matches/manage" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
                      <Settings className="w-4 h-4 text-slate-400" />
                      Manage Matches
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/matches" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      Register Match
                    </Link>
                    <Link href="/dashboard/scores" className="text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      My Scores
                    </Link>
                  </>
                )}

                {/* Logged in User Profile & Sign Out */}
                <div className="h-6 w-px bg-white/10" />
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-400" />
                  {accountType === 'director' ? 'Director' : 'Shooter'}
                </span>

                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-emerald-500 px-4 text-sm font-medium text-white shadow hover:opacity-90 transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus:outline-none cursor-pointer"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-white/5 bg-slate-950 px-4 pb-4 pt-2 space-y-2">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>

              {accountType === 'director' ? (
                <>
                  <Link
                    href="/matches/create"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    Build Match
                  </Link>
                  <Link
                    href="/matches/manage"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Manage Matches
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/matches"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Register Match
                  </Link>
                  <Link
                    href="/dashboard/scores"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    My Scores
                  </Link>
                </>
              )}

              <div className="h-px bg-white/5 my-2" />

              <div className="flex items-center justify-between px-3 py-2 text-sm text-slate-400">
                <span>Account Type:</span>
                <span className="font-semibold text-indigo-400 capitalize">{accountType}</span>
              </div>

              <button
                onClick={() => {
                  setIsOpen(false)
                  handleSignOut()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-emerald-500 px-3 py-2.5 text-base font-medium text-white transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
