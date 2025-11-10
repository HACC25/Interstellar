import { createFileRoute } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Download,
  Eye,
  GraduationCap,
  Loader2,
  Search,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react'

import type { CompleteDegreePathway_Output } from '../client/models/CompleteDegreePathway_Output'
import type { DegreePathwayBase_PathwayCourse_ } from '../client/models/DegreePathwayBase_PathwayCourse_'
import type { SemesterPlan_UHCoursePlan__Output } from '../client/models/SemesterPlan_UHCoursePlan__Output'
import type { UHCourse } from '../client/models/UHCourse'
import type { UHCoursePlan_Output } from '../client/models/UHCoursePlan_Output'
import type { YearPlan_UHCoursePlan__Output } from '../client/models/YearPlan_UHCoursePlan__Output'
import { useExportPathwayPdf } from '../hooks/useExportPathwayPdf'
import { usePredictDegreePathway } from '../hooks/usePredictDegreePathway'
import { usePredictDegreePathwayById } from '../hooks/usePredictDegreePathwayById'
import { usePathwayById } from '../hooks/usePathwayById'
import { usePathwaySimilarSearch } from '../hooks/usePathwaySimilarSearch'
import { usePathwayTextSearch } from '../hooks/usePathwayTextSearch'

export const Route = createFileRoute('/')({
  component: App,
})

const PENDING_MESSAGES = ['Analyzing your preferences', 'Creating college plan']

function App() {
  const [message, setMessage] = useState('')
  const [storedPlan, setStoredPlan] = useState<CompleteDegreePathway_Output | null>(null)
  const [statusIndex, setStatusIndex] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState<UHCoursePlan_Output | UHCourse | null>(
    null,
  )
  const [pathwayInput, setPathwayInput] = useState('')
  const [pathwayQuery, setPathwayQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'text' | 'similar'>('text')
  const [selectedPathway, setSelectedPathway] = useState<DegreePathwayBase_PathwayCourse_ | null>(
    null,
  )
  const [previewPathwayId, setPreviewPathwayId] = useState<string | null>(null)

  const prediction = usePredictDegreePathway()
  const predictionById = usePredictDegreePathwayById()

  const textSearch = usePathwayTextSearch(pathwayQuery, { enabled: searchMode === 'text' })
  const similarSearch = usePathwaySimilarSearch(pathwayQuery, {
    enabled: searchMode === 'similar',
  })
  const activeSearch = searchMode === 'text' ? textSearch : similarSearch

  const planToShow = predictionById.data ?? prediction.data ?? storedPlan
  const predictionError = predictionById.error ?? prediction.error ?? null
  const isPredicting = predictionById.isPending || prediction.isPending
  const pathwayResults = pathwayQuery ? activeSearch.data ?? [] : []
  const isSearchingPathways = activeSearch.isFetching
  const searchError = (activeSearch.error as Error | null) ?? null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (selectedPathway?.pathway_id) {
      predictionById.mutate({ pathwayId: selectedPathway.pathway_id, message })
      return
    }

    prediction.mutate(message)
  }

  const handleCourseSelect = (course: UHCoursePlan_Output | UHCourse) => {
    setSelectedCourse(course)
  }

  const handleCloseDetail = () => {
    setSelectedCourse(null)
  }

  const handlePathwaySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = pathwayInput.trim()
    setPathwayQuery(trimmed)
  }

  const handleSelectPathway = (pathway: DegreePathwayBase_PathwayCourse_) => {
    if (!pathway.pathway_id) {
      return
    }
    setSelectedPathway(pathway)
  }

  const handleClearSelectedPathway = () => {
    setSelectedPathway(null)
  }

  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem('degree-pathway:last-plan')
      const savedMessage = localStorage.getItem('degree-pathway:last-message')

      if (savedPlan) {
        setStoredPlan(JSON.parse(savedPlan) as CompleteDegreePathway_Output)
      }

      if (savedMessage) {
        setMessage(savedMessage)
      }
    } catch (error) {
      console.error('Failed to restore saved pathway plan', error)
    }
  }, [])

  useEffect(() => {
    const latestPlan = predictionById.data ?? prediction.data
    if (!latestPlan) {
      return
    }

    try {
      localStorage.setItem('degree-pathway:last-plan', JSON.stringify(latestPlan))
      setStoredPlan(latestPlan)
    } catch (error) {
      console.error('Failed to persist pathway plan', error)
    }
  }, [prediction.data, predictionById.data])

  useEffect(() => {
    try {
      if (message) {
        localStorage.setItem('degree-pathway:last-message', message)
      } else {
        localStorage.removeItem('degree-pathway:last-message')
      }
    } catch (error) {
      console.error('Failed to persist pathway message', error)
    }
  }, [message])

  useEffect(() => {
    if (!isPredicting) {
      setStatusIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setStatusIndex((index) => (index + 1) % PENDING_MESSAGES.length)
    }, 2000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isPredicting])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100">
      {isPredicting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-slate-800 bg-slate-950/80 px-12 py-10 shadow-2xl">
            <Loader2 className="h-16 w-16 animate-spin text-sky-400" />
            <div className="space-y-2 text-center">
              <p className="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">
                Launching plan
              </p>
              <p className="text-xl text-slate-100">{PENDING_MESSAGES[statusIndex]}</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-5xl">
        <div className="relative z-10 space-y-10 rounded-[32px] border border-slate-800/60 bg-slate-900/70 p-10 shadow-2xl backdrop-blur">
          <header className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-sky-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-[0.3em]">
                Degree Pathway Copilot
              </span>
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Design smarter journeys for every student
            </h1>
            <p className="mx-auto max-w-2xl text-base text-slate-400">
              Describe a student&apos;s goals, strengths, or constraints and we&apos;ll
              build a personalized academic pathway that keeps them on course.
            </p>
          </header>

          <section className="space-y-5 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-inner">
            <header className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Choose a template (optional)
              </p>
              <h2 className="text-xl font-semibold text-slate-50">Search official pathways</h2>
              <p className="text-sm text-slate-400">
                Start with a UH pathway and personalize it, or leave this blank for a fully
                generated plan.
              </p>
            </header>

            <div className="flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                onClick={() => setSearchMode('text')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  searchMode === 'text'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-200'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Quick text search
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('similar')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  searchMode === 'similar'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-200'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                Comprehensive search
              </button>
            </div>

            <form
              onSubmit={handlePathwaySearch}
              className="flex flex-col gap-3 md:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={pathwayInput}
                  onChange={(event) => setPathwayInput(event.target.value)}
                  placeholder="Search for Computer Science, Psychology, Nursing..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 py-3 pl-11 pr-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed"
                  disabled={isPredicting}
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-100 transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPredicting}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Search pathways
              </button>
            </form>

            {selectedPathway ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-slate-100 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Selected</p>
                  <p className="text-base font-semibold">{selectedPathway.program_name}</p>
                  <p className="text-sm text-slate-300">{selectedPathway.institution}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedPathway}
                  className="self-start rounded-full border border-slate-100/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:border-slate-100/60 hover:text-white"
                >
                  Clear selection
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No pathway selected yet. We&apos;ll craft a plan from scratch unless you choose
                one above.
              </p>
            )}

            {searchError && (
              <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {searchError.message}
              </p>
            )}

            {pathwayQuery ? (
              <div className="space-y-3">
                {isSearchingPathways ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-sky-400" aria-hidden="true" />
                    Searching pathways for “{pathwayQuery}”…
                  </div>
                ) : pathwayResults.length ? (
                  pathwayResults.map((pathway) => (
                    <PathwayResultCard
                      key={`${pathway.pathway_id ?? pathway.program_name}`}
                      pathway={pathway}
                      isSelected={pathway.pathway_id === selectedPathway?.pathway_id}
                      onSelect={handleSelectPathway}
                      onPreview={(pathwayId) => setPreviewPathwayId(pathwayId)}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    No pathways found for “{pathwayQuery}”. Try another title or switch search
                    modes.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Enter a keyword to browse matching pathways. Text search is instant; the
                comprehensive search digs deeper but may take longer.
              </p>
            )}
          </section>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-inner"
          >
            <label htmlFor="pathway-message" className="sr-only">
              Student context
            </label>
            <textarea
              id="pathway-message"
              name="pathway-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share a profile, interests, or transfer credits to map out the next steps..."
              className="min-h-[140px] w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-4 text-base leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed"
              disabled={isPredicting}
            />
            <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
              <span>
                Tip: mention preferred subjects, transfer credits, or time constraints for
                a sharper plan.
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPredicting}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {selectedPathway ? 'Refine this pathway' : 'Launch plan'}
              </button>
            </div>
          </form>

          {predictionError && (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {predictionError.message ?? 'Something went wrong. Please try again.'}
            </p>
          )}

          <div>
            {planToShow ? (
              <PathwayPlan plan={planToShow} onSelectCourse={handleCourseSelect} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-800/80 bg-slate-950/40 p-10 text-center text-slate-400">
                Your pathway plan will appear here with semester-by-semester guidance.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onClose={handleCloseDetail}
          onSelectCourse={handleCourseSelect}
        />
      )}

      {previewPathwayId && (
        <PathwayPreview
          pathwayId={previewPathwayId}
          onClose={() => setPreviewPathwayId(null)}
          onSelect={(pathway) => {
            handleSelectPathway(pathway)
            setPreviewPathwayId(null)
          }}
        />
      )}
    </div>
  )
}

function PathwayPlan({
  plan,
  onSelectCourse,
}: {
  plan: CompleteDegreePathway_Output
  onSelectCourse: (course: UHCoursePlan_Output | UHCourse) => void
}) {
  const exportMutation = useExportPathwayPdf()

  const { data: exportData, reset: resetExport } = exportMutation

  useEffect(() => {
    if (!exportData) {
      return
    }

    const { blob, filename } = exportData
    const objectUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)

    resetExport()
  }, [exportData, resetExport])

  const handleExport = () => {
    exportMutation.mutate(plan)
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-sky-300">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-[0.3em]">
            Pathway Plan
          </span>
        </div>
        <h2 className="text-3xl font-semibold text-slate-50">{plan.program_name}</h2>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {plan.institution} · {plan.total_credits} credits
        </p>
      </header>

      {plan.summary && (
        <article className="rounded-3xl border border-slate-800/70 bg-slate-950/50 p-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Plan summary
          </p>
          <p className="mt-2 text-base leading-relaxed text-slate-200">{plan.summary}</p>
        </article>
      )}

      {!!plan.candidates?.length && (
        <div className="flex flex-wrap justify-center gap-3">
          {plan.candidates.map((candidate) => (
            <span
              key={candidate.pathway_id}
              className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1 text-xs tracking-wide text-slate-300"
            >
              {candidate.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Preparing PDF…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export plan (PDF)
            </>
          )}
        </button>
      </div>

      {exportMutation.isError && (
        <p className="text-center text-xs text-rose-300">
          {exportMutation.error?.message ?? 'Unable to export plan. Please try again.'}
        </p>
      )}

      <div className="space-y-6">
        {plan.years.map((year) => (
          <YearCard key={year.year_number} year={year} onSelectCourse={onSelectCourse} />
        ))}
      </div>
    </section>
  )
}

function PathwayResultCard({
  pathway,
  isSelected,
  onSelect,
  onPreview,
}: {
  pathway: DegreePathwayBase_PathwayCourse_
  isSelected: boolean
  onSelect: (pathway: DegreePathwayBase_PathwayCourse_) => void
  onPreview: (pathwayId: string) => void
}) {
  const pathwayId = pathway.pathway_id
  const yearCount = pathway.years?.length ?? 0

  return (
    <article
      className={`rounded-2xl border p-4 shadow-inner ${
        isSelected
          ? 'border-sky-400 bg-sky-500/5'
          : 'border-slate-800/70 bg-slate-950/40'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {pathway.institution}
          </p>
          <h3 className="text-lg font-semibold text-slate-50">{pathway.program_name}</h3>
          <p className="text-sm text-slate-400">
            {pathway.total_credits} credits · {yearCount} year{yearCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!pathwayId}
            onClick={() => pathwayId && onSelect(pathway)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed ${
              isSelected
                ? 'border border-sky-400 bg-sky-500/20 text-sky-100'
                : 'border border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isSelected ? 'Selected' : 'Use pathway'}
          </button>
          <button
            type="button"
            disabled={!pathwayId}
            onClick={() => pathwayId && onPreview(pathwayId)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            View details
          </button>
        </div>
      </div>
    </article>
  )
}

function PathwayPreview({
  pathwayId,
  onClose,
  onSelect,
}: {
  pathwayId: string
  onClose: () => void
  onSelect: (pathway: DegreePathwayBase_PathwayCourse_) => void
}) {
  const { data, isFetching, isError, error } = usePathwayById(pathwayId)
  const handleUsePathway = () => {
    if (data) {
      onSelect(data)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur">
      <div className="relative w-full max-w-3xl space-y-6 rounded-3xl border border-slate-800 bg-slate-950/90 p-8 text-slate-100 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 text-sm font-semibold uppercase tracking-wide text-slate-400 transition hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Close
        </button>

        {isFetching && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-sky-400" aria-hidden="true" />
            Loading pathway…
          </div>
        )}

        {isError && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {(error as Error | undefined)?.message ?? 'Unable to load pathway details.'}
          </p>
        )}

        {data && (
          <div className="space-y-6">
            <header className="space-y-1 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {data.institution}
              </p>
              <h3 className="text-2xl font-semibold">{data.program_name}</h3>
              <p className="text-sm text-slate-400">
                {data.total_credits} credits · {data.years.length} years
              </p>
            </header>

            <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-2">
              {data.years.map((year) => (
                <article
                  key={year.year_number}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4"
                >
                  <p className="text-sm font-semibold text-slate-200">
                    Year {year.year_number}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {year.semesters.map((semester) => (
                      <div
                        key={`${year.year_number}-${semester.semester_name}`}
                        className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-3"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                          {formatSemesterName(semester.semester_name)}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-300">
                          {semester.courses.map((course, index) => (
                            <li key={`${course.name}-${index}`}>
                              <span className="font-medium text-slate-100">{course.name}</span>
                              <span className="text-slate-400"> · {course.credits} credits</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleUsePathway}
                className="inline-flex items-center gap-2 rounded-full border border-sky-400 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-400/10 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Use this pathway
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function YearCard({
  year,
  onSelectCourse,
}: {
  year: YearPlan_UHCoursePlan__Output
  onSelectCourse: (course: UHCoursePlan_Output | UHCourse) => void
}) {
  const yearCredits = year.semesters.reduce(
    (total, semester) => total + (semester.credits ?? 0),
    0,
  )

  return (
    <article className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 pt-2 text-sm uppercase tracking-[0.3em] text-slate-400 md:flex-row md:items-center md:justify-between">
        <span className="text-lg font-semibold normal-case tracking-tight text-slate-200">
          Year {year.year_number}
        </span>
        <span>{yearCredits} credits</span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {year.semesters.map((semester) => (
          <SemesterCard
            key={`${year.year_number}-${semester.semester_name}`}
            semester={semester}
            onSelectCourse={onSelectCourse}
          />
        ))}
      </div>
    </article>
  )
}

function SemesterCard({
  semester,
  onSelectCourse,
}: {
  semester: SemesterPlan_UHCoursePlan__Output
  onSelectCourse: (course: UHCoursePlan_Output | UHCourse) => void
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4">
      <header className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {formatSemesterName(semester.semester_name)}
          </h3>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Semester</p>
        </div>
        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-300">
          {semester.credits} credits
        </span>
      </header>

      <div className="space-y-3">
        {semester.courses.map((course, index) => (
          <CourseRow
            key={
              course.course_id ?? `${course.course_prefix}-${course.course_number}-${index}`
            }
            course={course}
            onSelectCourse={onSelectCourse}
          />
        ))}
      </div>
    </section>
  )
}

function CourseRow({
  course,
  onSelectCourse,
}: {
  course: UHCoursePlan_Output
  onSelectCourse: (course: UHCoursePlan_Output | UHCourse) => void
}) {
  const credits =
    course.num_units.min === course.num_units.max
      ? course.num_units.min
      : `${course.num_units.min}-${course.num_units.max}`
  const hasCandidates = Boolean(course.candidates?.length)

  return (
    <div className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-inner">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-200">
            {course.course_prefix} {course.course_number}
            {course.course_suffix ? ` ${course.course_suffix}` : ''}
          </p>
          <h4 className="text-base font-medium text-slate-100">{course.course_title}</h4>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            {credits} credits
          </span>
          <button
            type="button"
            onClick={() => onSelectCourse(course)}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            View details
          </button>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-400">{course.course_desc}</p>

      {!!course.designations?.length && (
        <div className="flex flex-wrap gap-2">
          {course.designations.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-800/80 px-3 py-1 text-xs uppercase tracking-wide text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {hasCandidates && (
        <div className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Candidate Courses
          </p>
          <div className="flex flex-wrap gap-2">
            {course.candidates?.map((candidate) => (
              <button
                key={
                  candidate.course_id ??
                  `${candidate.course_prefix}-${candidate.course_number}-${candidate.course_suffix ?? 'base'}`
                }
                type="button"
                onClick={() => onSelectCourse(candidate)}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-slate-600 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <span className="block font-semibold">
                  {candidate.course_prefix} {candidate.course_number}
                  {candidate.course_suffix ? ` ${candidate.course_suffix}` : ''}
                </span>
                <span className="text-slate-400">{candidate.course_title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CourseDetail({
  course,
  onClose,
  onSelectCourse,
}: {
  course: UHCoursePlan_Output | UHCourse
  onClose: () => void
  onSelectCourse: (course: UHCoursePlan_Output | UHCourse) => void
}) {
  const credits =
    course.num_units.min === course.num_units.max
      ? course.num_units.min
      : `${course.num_units.min}-${course.num_units.max}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur">
      <div className="relative w-full max-w-2xl space-y-6 rounded-3xl border border-slate-800 bg-slate-950/90 p-8 text-slate-100 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 text-sm font-semibold uppercase tracking-wide text-slate-400 transition hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Close
        </button>

        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Course Detail
          </p>
          <h3 className="text-2xl font-semibold">
            {course.course_prefix} {course.course_number}
            {course.course_suffix ? ` ${course.course_suffix}` : ''}
          </h3>
          <p className="text-lg text-slate-300">{course.course_title}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="rounded-full bg-sky-500/15 px-3 py-1 font-semibold uppercase tracking-wide text-sky-300">
            {credits} credits
          </span>
          <span className="rounded-full border border-slate-800 px-3 py-1 uppercase tracking-wide text-slate-400">
            {course.dept_name}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">{course.course_desc}</p>

        {!!course.designations?.length && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Designations
            </p>
            <div className="flex flex-wrap gap-2">
              {course.designations.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-800/80 px-3 py-1 text-xs uppercase tracking-wide text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {'metadata' in course && course.metadata && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Additional Information
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-300">{course.metadata}</p>
          </div>
        )}

        {'candidates' in course && course.candidates?.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Candidate Courses
            </p>
            <div className="flex flex-wrap gap-2">
              {course.candidates.map((candidate) => (
                <button
                  key={
                    candidate.course_id ??
                    `${candidate.course_prefix}-${candidate.course_number}-${candidate.course_suffix ?? 'base'}`
                  }
                  type="button"
                  onClick={() => onSelectCourse(candidate)}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-slate-600 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  <span className="block font-semibold">
                    {candidate.course_prefix} {candidate.course_number}
                    {candidate.course_suffix ? ` ${candidate.course_suffix}` : ''}
                  </span>
                  <span className="text-slate-400">{candidate.course_title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const formatSemesterName = (
  name: SemesterPlan_UHCoursePlan__Output['semester_name'],
): string => name.charAt(0).toUpperCase() + name.slice(1)
