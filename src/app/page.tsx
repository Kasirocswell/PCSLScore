import Link from 'next/link'
import { Target, Trophy, Shield, ArrowRight, Zap, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-950 via-zinc-950 to-black text-slate-100 overflow-hidden relative flex flex-col justify-center">
      {/* Background Decorative Glows */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center">
        
        {/* Sparkle Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-indigo-300 font-semibold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          The Future of Practical Shooting Scoring
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Scoring Redefined for
          </span>{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            PCSL matches.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg md:text-xl text-slate-400 leading-relaxed mb-12">
          An ultra-premium, real-time, offline-capable platform designed for the Practical Competition Shooting League. Seamlessly manage match registrations, build stages, and track hits with precision.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20 w-full max-w-sm sm:max-w-none">
          <Link
            href="/auth/signup"
            className="group inline-flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-300 transform active:scale-95 text-base cursor-pointer"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform animate-bounce" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center py-4 px-8 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl transition-all duration-300 active:scale-95 text-base cursor-pointer"
          >
            Sign In
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          
          {/* Card 1 */}
          <div className="group backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl text-left transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">For Shooters</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Register for events in seconds, access detailed analytics of your match history, and see real-time leaderboards update stage by stage.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl text-left transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/10 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-300">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">For Match Directors</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Build stages, define targets, register squads, and track progress offline. Seamlessly sync scoring tablet inputs back to the cloud.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl text-left transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/10 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Ultra-Fast Scoring</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Hit-factor calculation is handled instantly under the PCSL official rulebook with support for K-Factor, penalties, and division classes.
            </p>
          </div>

        </div>

      </div>
    </div>
  )
}
