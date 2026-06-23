'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateMatchAction,
  createStageAction,
  updateStageAction,
  deleteStageAction,
  addTargetAction,
  deleteTargetAction,
  createSquadAction,
  deleteSquadAction
} from '../../actions'
import {
  ArrowLeft,
  Settings,
  Layers,
  Users,
  Save,
  Trash2,
  Plus,
  Loader2,
  Calendar,
  MapPin,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Layers3,
  Target,
  CheckCircle,
  AlertTriangle,
  Trophy
} from 'lucide-react'

interface TargetItem {
  id: string
  target_name: string
  target_type: 'paper' | 'steel' | 'frangible' | 'no-shoot'
  required_hits: number
}

interface StageItem {
  id: string
  name: string
  stage_number: number
  description: string | null
  required_hits_per_paper_target: number
  required_hits_per_steel_target: number
  max_points: number
  targets?: TargetItem[]
}

interface SquadItem {
  id: string
  name: string
  max_capacity: number
}

interface ClubItem {
  id: string
  name: string
}

interface MatchDetails {
  id: string
  club_id: string
  name: string
  description: string | null
  date: string
  location: string
  match_type: string
  payment_required: boolean
  price: number
  is_published: boolean
  clubs?: ClubItem
  stages?: StageItem[]
  squads?: SquadItem[]
}

interface MatchWorkspaceProps {
  match: MatchDetails
}

export default function MatchWorkspace({ match }: MatchWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'stages' | 'squads'>('stages')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Settings Tab State
  const [paymentRequired, setPaymentRequired] = useState(match.payment_required)

  // Stages & Targets Builder State
  const [selectedStageId, setSelectedStageId] = useState<string | null>(
    match.stages && match.stages.length > 0 ? match.stages[0].id : null
  )
  const [stageFormMode, setStageFormMode] = useState<'create' | 'edit' | 'none'>('none')
  const [editingStage, setEditingStage] = useState<StageItem | null>(null)

  // Form Fields for Stage Create/Edit
  const [stageName, setStageName] = useState('')
  const [stageNumber, setStageNumber] = useState(match.stages ? match.stages.length + 1 : 1)
  const [stageDesc, setStageDesc] = useState('')
  const [stagePaperHits, setStagePaperHits] = useState(2)
  const [stageSteelHits, setStageSteelHits] = useState(1)

  // Target Form Fields
  const [targetNameInput, setTargetNameInput] = useState('')
  const [targetTypeInput, setTargetTypeInput] = useState<'paper' | 'steel' | 'frangible' | 'no-shoot'>('paper')
  const [targetHitsInput, setTargetHitsInput] = useState(2)

  // Squad Form Fields
  const [squadName, setSquadName] = useState('')
  const [squadCapacity, setSquadCapacity] = useState(10)

  const router = useRouter()

  const selectedStage = match.stages?.find(s => s.id === selectedStageId)

  // Toast Helpers
  function triggerError(msg: string) {
    setError(msg)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function triggerSuccess(msg: string) {
    setSuccess(msg)
    setError(null)
    setTimeout(() => setSuccess(null), 4000)
  }

  // Settings Actions
  async function handleUpdateSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const res = await updateMatchAction(match.id, formData)

    setLoading(false)
    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess('Match settings updated successfully!')
      router.refresh()
    }
  }

  // Stages Actions
  function openCreateStage() {
    setStageFormMode('create')
    setEditingStage(null)
    setStageName('')
    setStageNumber(match.stages ? match.stages.length + 1 : 1)
    setStageDesc('')
    setStagePaperHits(2)
    setStageSteelHits(1)
  }

  function openEditStage(stage: StageItem) {
    setStageFormMode('edit')
    setEditingStage(stage)
    setStageName(stage.name)
    setStageNumber(stage.stage_number)
    setStageDesc(stage.description || '')
    setStagePaperHits(stage.required_hits_per_paper_target)
    setStageSteelHits(stage.required_hits_per_steel_target)
  }

  async function handleSaveStage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    let res: any

    if (stageFormMode === 'create') {
      res = await createStageAction(match.id, formData)
    } else if (stageFormMode === 'edit' && editingStage) {
      res = await updateStageAction(match.id, editingStage.id, formData)
    }

    setLoading(false)
    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess(
        stageFormMode === 'create'
          ? 'Stage created successfully!'
          : 'Stage updated successfully!'
      )
      setStageFormMode('none')
      if (stageFormMode === 'create' && res?.stage) {
        setSelectedStageId(res.stage.id)
      }
      router.refresh()
    }
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm('Are you sure you want to delete this stage? All targets and recorded scores will be lost.')) return
    setLoading(true)
    setError(null)

    const res = await deleteStageAction(match.id, stageId)
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess('Stage deleted successfully!')
      if (selectedStageId === stageId) {
        const remaining = match.stages?.filter(s => s.id !== stageId)
        setSelectedStageId(remaining && remaining.length > 0 ? remaining[0].id : null)
      }
      router.refresh()
    }
  }

  // Targets Actions
  async function handleAddTarget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedStageId) return
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const res = await addTargetAction(match.id, selectedStageId, formData)
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      setTargetNameInput('')
      // Reset default required hit depending on type
      triggerSuccess('Target added successfully!')
      router.refresh()
    }
  }

  async function handleDeleteTarget(targetId: string) {
    if (!selectedStageId) return
    setLoading(true)
    setError(null)

    const res = await deleteTargetAction(match.id, selectedStageId, targetId)
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess('Target deleted successfully!')
      router.refresh()
    }
  }

  function handleTargetTypeChange(type: 'paper' | 'steel' | 'frangible' | 'no-shoot') {
    setTargetTypeInput(type)
    if (type === 'paper') {
      setTargetHitsInput(selectedStage?.required_hits_per_paper_target || 2)
    } else if (type === 'steel' || type === 'frangible') {
      setTargetHitsInput(selectedStage?.required_hits_per_steel_target || 1)
    } else {
      setTargetHitsInput(0) // No-shoots don't require hits
    }
  }

  // Squads Actions
  async function handleCreateSquad(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const res = await createSquadAction(match.id, formData)
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      setSquadName('')
      setSquadCapacity(10)
      triggerSuccess('Squad created successfully!')
      router.refresh()
    }
  }

  async function handleDeleteSquad(squadId: string) {
    if (!confirm('Are you sure you want to delete this squad?')) return
    setLoading(true)
    setError(null)

    const res = await deleteSquadAction(match.id, squadId)
    setLoading(false)

    if (res?.error) {
      triggerError(res.error)
    } else {
      triggerSuccess('Squad deleted successfully!')
      router.refresh()
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-12 bg-slate-950 text-slate-100 relative">
      {/* Decorative Glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <Link
              href="/matches/manage"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group mb-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Matches
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {match.name}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                match.is_published 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/25'
              }`}>
                {match.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="text-sm text-indigo-400 font-semibold">
              Match Management Workspace • {match.clubs?.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              href={`/matches/${match.id}/score`}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 rounded-xl transition shadow-lg hover:shadow-cyan-500/10 active:scale-95 w-full sm:w-auto justify-center cursor-pointer"
            >
              <Target className="w-4 h-4 text-slate-950" />
              Open Range Scorekeeper
            </Link>
            <Link
              href={`/matches/${match.id}/scores`}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl transition active:scale-95 w-full sm:w-auto justify-center cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-cyan-400" />
              Live Leaderboard
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-white/5 gap-2">
          <button
            onClick={() => { setActiveTab('stages'); setStageFormMode('none') }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'stages'
                ? 'border-indigo-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Stages & Targets
          </button>
          <button
            onClick={() => { setActiveTab('squads'); setStageFormMode('none') }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'squads'
                ? 'border-indigo-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Squad Sheet
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setStageFormMode('none') }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-white bg-white/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* TAB 1: STAGES & TARGETS */}
        {activeTab === 'stages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Stage Selector Column */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers3 className="w-5 h-5 text-indigo-400" />
                  Match Stages
                </h2>
                {stageFormMode === 'none' && (
                  <button
                    onClick={openCreateStage}
                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Stage
                  </button>
                )}
              </div>

              {/* Stage Form Card (Creating / Editing) */}
              {stageFormMode !== 'none' && (
                <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4 shadow-xl">
                  <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">
                    {stageFormMode === 'create' ? 'Create New Stage' : 'Edit Stage Configuration'}
                  </h3>
                  <form onSubmit={handleSaveStage} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Stage Number</label>
                      <input
                        type="number"
                        name="stage_number"
                        required
                        value={stageNumber}
                        onChange={(e) => setStageNumber(parseInt(e.target.value) || 0)}
                        min="1"
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Stage Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. Speed Option"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">WSB Brief / Notes</label>
                      <textarea
                        name="description"
                        rows={2}
                        placeholder="Shooter starts box A, loaded rifle held at port arms..."
                        value={stageDesc}
                        onChange={(e) => setStageDesc(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1" title="Default hits for paper targets on this stage">Paper Req. Hits</label>
                        <input
                          type="number"
                          name="required_hits_per_paper_target"
                          required
                          value={stagePaperHits}
                          onChange={(e) => setStagePaperHits(parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1" title="Default hits for steel targets on this stage">Steel Req. Hits</label>
                        <input
                          type="number"
                          name="required_hits_per_steel_target"
                          required
                          value={stageSteelHits}
                          onChange={(e) => setStageSteelHits(parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setStageFormMode('none')}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Save Stage
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Stage Cards List */}
              <div className="space-y-3">
                {match.stages && match.stages.length > 0 ? (
                  match.stages.map((stage) => {
                    const isSelected = stage.id === selectedStageId
                    return (
                      <div
                        key={stage.id}
                        onClick={() => setSelectedStageId(stage.id)}
                        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/15'
                            : 'bg-white/5 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                              Stage {stage.stage_number}
                            </span>
                            <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors mt-0.5">
                              {stage.name}
                            </h3>
                            <span className="text-xs text-slate-400 mt-1 block">
                              Max Points: <strong className="text-emerald-400">{stage.max_points || 0}</strong>
                            </span>
                          </div>
                          
                          {/* Controls */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEditStage(stage)}
                              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                              title="Edit Stage Config"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Stage"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-slate-500 text-sm">
                    No stages designed yet. Click &quot;Add Stage&quot; above to create one.
                  </div>
                )}
              </div>
            </div>

            {/* Target Layout Column (Middle/Right) */}
            <div className="lg:col-span-2 space-y-6">
              {selectedStage ? (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Stage Details summary card */}
                  <div className="backdrop-blur-xl bg-slate-900/30 border border-white/5 p-6 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Stage {selectedStage.stage_number} Configuration
                        </span>
                        <h2 className="text-2xl font-extrabold text-white mt-1">
                          {selectedStage.name}
                        </h2>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Stage Max Score</div>
                        <div className="text-2xl font-extrabold text-emerald-400">{selectedStage.max_points || 0} pts</div>
                      </div>
                    </div>

                    {selectedStage.description && (
                      <p className="text-sm text-slate-300 bg-slate-950/40 p-3 rounded-lg leading-relaxed border border-white/5">
                        {selectedStage.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2 text-xs text-slate-400">
                      <div>
                        Standard Paper Neut: <strong className="text-white">{selectedStage.required_hits_per_paper_target} hits</strong>
                      </div>
                      <div>
                        Standard Steel Neut: <strong className="text-white">{selectedStage.required_hits_per_steel_target} hits</strong>
                      </div>
                    </div>
                  </div>

                  {/* Targets Section */}
                  <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-400" />
                        Stage Targets
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        {selectedStage.targets?.length || 0} total targets configured
                      </span>
                    </div>

                    {/* Target Adder Form Inline */}
                    <form onSubmit={handleAddTarget} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Name</label>
                        <input
                          type="text"
                          name="target_name"
                          required
                          value={targetNameInput}
                          onChange={(e) => setTargetNameInput(e.target.value)}
                          placeholder="e.g. T1, S1"
                          className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Type</label>
                        <select
                          name="target_type"
                          required
                          value={targetTypeInput}
                          onChange={(e) => handleTargetTypeChange(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="paper">Paper Target</option>
                          <option value="steel">Steel Plate</option>
                          <option value="frangible">Frangible / Clay</option>
                          <option value="no-shoot">No-Shoot (Penalty)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Req. Hits</label>
                        <input
                          type="number"
                          name="required_hits"
                          required
                          value={targetHitsInput}
                          onChange={(e) => setTargetHitsInput(parseInt(e.target.value) || 0)}
                          min="0"
                          disabled={targetTypeInput === 'no-shoot'}
                          className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Add Target
                        </button>
                      </div>
                    </form>

                    {/* Targets List Table */}
                    {selectedStage.targets && selectedStage.targets.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              <th className="pb-3 pl-4">Target ID</th>
                              <th className="pb-3">Type</th>
                              <th className="pb-3">Required Hits</th>
                              <th className="pb-3 text-right pr-4">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-sm">
                            {selectedStage.targets.map((target) => (
                              <tr key={target.id} className="hover:bg-white/5">
                                <td className="py-3 pl-4 font-bold text-white">{target.target_name}</td>
                                <td className="py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                                    target.target_type === 'paper' ? 'bg-indigo-500/15 text-indigo-400' :
                                    target.target_type === 'steel' ? 'bg-emerald-500/15 text-emerald-400' :
                                    target.target_type === 'frangible' ? 'bg-amber-500/15 text-amber-400' :
                                    'bg-rose-500/15 text-rose-400'
                                  }`}>
                                    {target.target_type === 'no-shoot' ? 'No-Shoot' : target.target_type}
                                  </span>
                                </td>
                                <td className="py-3 text-slate-300">
                                  {target.target_type === 'no-shoot' ? 'N/A' : target.required_hits}
                                </td>
                                <td className="py-3 text-right pr-4">
                                  <button
                                    onClick={() => handleDeleteTarget(target.id)}
                                    disabled={loading}
                                    className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center text-slate-500 text-sm">
                        No targets added to this stage. Use the form above to add targets (e.g. T1, T2, S1) to make the stage scorable.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-12 rounded-2xl flex flex-col justify-center items-center text-center max-w-md mx-auto space-y-6">
                  <div className="w-16 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Layers3 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">No Stage Selected</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Select a stage from the left-hand menu to configure its targets and calculate its maximum scoring breakdown.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SQUAD SHEET */}
        {activeTab === 'squads' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Squad Adder Form Column */}
            <div className="lg:col-span-1">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6 shadow-2xl">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-400" />
                    Create Squad
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Add squad rows with limited capacity so competitors can organize themselves.
                  </p>
                </div>

                <form onSubmit={handleCreateSquad} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Squad Name <span className="text-emerald-400 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={squadName}
                      onChange={(e) => setSquadName(e.target.value)}
                      placeholder="e.g. Squad 1 - Morning"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Max Competitors <span className="text-emerald-400 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      name="max_capacity"
                      required
                      value={squadCapacity}
                      onChange={(e) => setSquadCapacity(parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Squad Row
                  </button>
                </form>
              </div>
            </div>

            {/* Squads Listing Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Squad Sheets
                </h2>
                <span className="text-xs font-semibold text-slate-400">
                  {match.squads?.length || 0} Active Squads
                </span>
              </div>

              {match.squads && match.squads.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {match.squads.map((squad) => (
                    <div
                      key={squad.id}
                      className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <h3 className="font-bold text-white text-base">{squad.name}</h3>
                        <p className="text-xs text-slate-400">
                          Capacity Constraint: <strong className="text-emerald-400">{squad.max_capacity}</strong> shooters max
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteSquad(squad.id)}
                        disabled={loading}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Squad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-12 rounded-2xl flex flex-col justify-center items-center text-center space-y-6">
                  <div className="w-16 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">No Squads Configured</h3>
                    <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                      Create squads using the builder panel on the left so your registered competitors can assign themselves to shoot in organized groups.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6 shadow-2xl">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Edit Match Settings
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Modify match parameters, publishing toggles, location descriptions, and pricing structures.
              </p>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-6">
              {/* Match Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Match Name <span className="text-emerald-400 font-bold">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Target className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={match.name}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Match Type & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Match Type <span className="text-emerald-400 font-bold">*</span>
                  </label>
                  <select
                    name="match_type"
                    required
                    defaultValue={match.match_type}
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-all text-sm"
                  >
                    <option value="2-Gun">2-Gun</option>
                    <option value="Pistol Caliber 2-Gun">Pistol Caliber 2-Gun</option>
                    <option value="Rifle">Rifle</option>
                    <option value="Pistol">Pistol</option>
                    <option value="Shotgun">Shotgun</option>
                    <option value="3-Gun">3-Gun</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Match Date <span className="text-emerald-400 font-bold">*</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={match.date}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Range Location <span className="text-emerald-400 font-bold">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="location"
                    required
                    defaultValue={match.location}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Match Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Match Description
                </label>
                <div className="relative group">
                  <span className="absolute top-3 left-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Briefcase className="w-4 h-4" />
                  </span>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={match.description || ''}
                    placeholder="Details about schedules, divisions, requirements, range procedures..."
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm resize-none"
                  />
                </div>
              </div>

              {/* Payment & Price Settings */}
              <div className="p-4 rounded-xl border border-white/5 bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-white">Payment Required to Squad</label>
                    <p className="text-xs text-slate-400">Lock competitor squad selection until registration fee is prepaid.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="payment_required"
                      value="true"
                      checked={paymentRequired}
                      onChange={(e) => setPaymentRequired(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {paymentRequired && (
                  <div className="pt-2 border-t border-white/5 animate-fadeIn">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Registration Fee (USD)
                    </label>
                    <div className="relative group max-w-[200px]">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                        <DollarSign className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        name="price"
                        required={paymentRequired}
                        min="0.01"
                        step="0.01"
                        defaultValue={match.price}
                        className="w-full pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Publishing Setting */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-slate-900/40">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-white">Publish Match</label>
                  <p className="text-xs text-slate-400">Make this match instantly discoverable by public shooters.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="is_published"
                    value="true"
                    defaultChecked={match.is_published}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-end items-center gap-3">
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
                      Save Match Configuration
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
