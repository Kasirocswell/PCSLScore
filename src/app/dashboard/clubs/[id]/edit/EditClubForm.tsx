'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateClubAction, deleteClubAction } from '../../actions'
import { ArrowLeft, Building2, MapPin, AlignLeft, Loader2, Save, Trash2, AlertTriangle, X, HelpCircle } from 'lucide-react'

interface Club {
  id: string
  name: string
  location: string
  zip_code: string | null
  description: string | null
}

interface EditClubFormProps {
  club: Club
}

export default function EditClubForm({ club }: EditClubFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const result = await updateClubAction(club.id, formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/dashboard/clubs')
      router.refresh()
    }
  }

  async function handleDelete() {
    setError(null)
    setDeleting(true)

    const result = await deleteClubAction(club.id)

    if (result?.error) {
      setError(result.error)
      setDeleting(false)
      setShowDeleteConfirm(false)
    } else {
      router.push('/dashboard/clubs')
      router.refresh()
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 relative">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link
              href="/dashboard/clubs"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group mb-3"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Clubs
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Configure Club
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Update details or permanently remove <span className="text-indigo-400 font-medium">{club.name}</span>.
            </p>
          </div>

          {!showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Club
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>{error}</span>
          </div>
        )}

        {/* Delete Confirmation Box */}
        {showDeleteConfirm && (
          <div className="backdrop-blur-xl bg-rose-950/15 border border-rose-500/30 p-6 rounded-2xl space-y-4 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute top-0 right-0 p-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Delete &ldquo;{club.name}&rdquo;?</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                  This action is <span className="text-rose-400 font-medium">permanent</span> and will delete the shooting club along with all matches, stages, and scoring records associated with it. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-rose-500/10 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Permanent Delete
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Update Form Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6 shadow-2xl">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* Club Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Club Name <span className="text-emerald-400 font-bold">*</span>
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={club.name}
                  placeholder="e.g. Blue Ridge Practical Shooters"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Location & ZIP Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Range / Location <span className="text-emerald-400 font-bold">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="location"
                    required
                    defaultValue={club.location}
                    placeholder="e.g. 123 Gun Range Road, Boulder, CO"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  ZIP Code
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="zip_code"
                    defaultValue={club.zip_code || ''}
                    placeholder="e.g. 80302"
                    pattern="[a-zA-Z0-9\s\-]*"
                    maxLength={10}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Club Description
              </label>
              <div className="relative group">
                <span className="absolute top-3 left-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200">
                  <AlignLeft className="w-4 h-4" />
                </span>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={club.description || ''}
                  placeholder="Describe your club, standard matches, facility features, or schedule..."
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 text-sm resize-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-end items-center gap-3">
              <Link
                href="/dashboard/clubs"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
