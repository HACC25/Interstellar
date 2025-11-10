import { createFileRoute } from '@tanstack/react-router'
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Loader2,
  Maximize,
  Send,
  Sparkles,
  X,
} from 'lucide-react'

import type { CompleteDegreePathway_Output } from '../client/models/CompleteDegreePathway_Output'
import type { SemesterPlan_UHCoursePlan__Output } from '../client/models/SemesterPlan_UHCoursePlan__Output'
import type { UHCourse } from '../client/models/UHCourse'
import type { UHCoursePlan_Output } from '../client/models/UHCoursePlan_Output'
import { useExportPathwayPdf } from '../hooks/useExportPathwayPdf'
import { usePredictDegreePathway } from '../hooks/usePredictDegreePathway'

type FlattenedSemester = {
  yearNumber: number
  semester: SemesterPlan_UHCoursePlan__Output
}

export const Route = createFileRoute('/v1')({
  component: AppV1,
})

const PENDING_MESSAGES = ['Analyzing your preferences', 'Creating college plan']

function AppV1() {
  const [message, setMessage] = useState('')
  const [storedPlan, setStoredPlan] = useState<CompleteDegreePathway_Output | null>(null)
  const [statusIndex, setStatusIndex] = useState(0)
  const [selectedCourse, setSelectedCourse] = useState<UHCoursePlan_Output | UHCourse | null>(
    null,
  )
  const [activeSemesterIndex, setActiveSemesterIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const prediction = usePredictDegreePathway()
  const planToShow = prediction.data ?? storedPlan

  const flattenedSemesters = useMemo<FlattenedSemester[]>(() => {
    if (!planToShow) {
      return []
    }

    return planToShow.years.flatMap((year) =>
      year.semesters.map((semester) => ({
        yearNumber: year.year_number,
        semester,
      })),
    )
  }, [planToShow])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    prediction.mutate(message)
  }

  const handleCourseSelect = (course: UHCoursePlan_Output | UHCourse) => {
    setSelectedCourse(course)
  }

  const handleCloseDetail = () => {
    setSelectedCourse(null)
  }

  const handleEnterFullscreen = () => {
    setIsFullscreen(true)
  }

  const handleExitFullscreen = () => {
    setIsFullscreen(false)
  }

  const navigateSemesters = useCallback(
    (direction: number) => {
      if (!flattenedSemesters.length) {
        return
      }

      setActiveSemesterIndex((index) => {
        const nextIndex = Math.min(
          flattenedSemesters.length - 1,
          Math.max(0, index + direction),
        )
        return nextIndex
      })
    },
    [flattenedSemesters.length],
  )

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
    if (!prediction.data) {
      return
    }

    try {
      localStorage.setItem('degree-pathway:last-plan', JSON.stringify(prediction.data))
      setStoredPlan(prediction.data)
    } catch (error) {
      console.error('Failed to persist pathway plan', error)
    }
  }, [prediction.data])

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
    if (!prediction.isPending) {
      setStatusIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setStatusIndex((index) => (index + 1) % PENDING_MESSAGES.length)
    }, 2000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [prediction.isPending])

  useEffect(() => {
    setActiveSemesterIndex(0)
  }, [planToShow])

  useEffect(() => {
    if (!planToShow) {
      setIsFullscreen(false)
    }
  }, [planToShow])

  useEffect(() => {
    if (!isFullscreen || typeof document === 'undefined') {
      return
    }

    const body = document.body
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    return () => {
      body.style.overflow = previousOverflow
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!isFullscreen || typeof window === 'undefined') {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!flattenedSemesters.length) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateSemesters(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateSemesters(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [flattenedSemesters.length, navigateSemesters])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {prediction.isPending && (
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

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
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
            Describe a student&apos;s goals, strengths, or constraints and we&apos;ll build a
            personalized academic pathway that keeps them on course.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-inner backdrop-blur"
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
            disabled={prediction.isPending}
          />
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
            <span>
              Tip: mention preferred subjects, transfer credits, or time constraints for a
              sharper plan.
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={prediction.isPending}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Launch Plan
            </button>
          </div>
        </form>

        {prediction.isError && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {prediction.error?.message ?? 'Something went wrong. Please try again.'}
          </p>
        )}

        <div className="flex flex-1 pb-10">
          {planToShow ? (
            <PathwayPlanCarousel
              plan={planToShow}
              semesters={flattenedSemesters}
              activeIndex={activeSemesterIndex}
              onSemesterSelect={setActiveSemesterIndex}
              onNavigate={navigateSemesters}
              onSelectCourse={handleCourseSelect}
              onRequestFullscreen={handleEnterFullscreen}
            />
          ) : (
            <div className="flex w-full items-center justify-center rounded-3xl border border-dashed border-slate-800/80 bg-slate-950/40 p-10 text-center text-slate-400">
              Your pathway plan will appear here with semester-by-semester guidance.
            </div>
          )}
        </div>
      </div>

      {isFullscreen && planToShow && (
        <div className="fixed inset-0 z-40 flex justify-center bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-6 py-8">
            <PathwayPlanCarousel
              plan={planToShow}
              semesters={flattenedSemesters}
              activeIndex={activeSemesterIndex}
              onSemesterSelect={setActiveSemesterIndex}
              onNavigate={navigateSemesters}
              onSelectCourse={handleCourseSelect}
              isFullscreen
              onExitFullscreen={handleExitFullscreen}
            />
          </div>
        </div>
      )}

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onClose={handleCloseDetail}
          onSelectCourse={handleCourseSelect}
        />
      )}
    </div>
  )
}

function PathwayPlanCarousel({
  plan,
  semesters,
  activeIndex,
  onSemesterSelect,
  onNavigate,
  onSelectCourse,
  isFullscreen = false,
  onRequestFullscreen,
  onExitFullscreen,
}: {
  plan: CompleteDegreePathway_Output
  semesters: FlattenedSemester[]
  activeIndex: number
  onSemesterSelect: (index: number) => void
  onNavigate: (direction: number) => void
  onSelectCourse: (course: UHCoursePlan_Output | UHCourse) => void
  isFullscreen?: boolean
  onRequestFullscreen?: () => void
  onExitFullscreen?: () => void
}) {
  const exportMutation = useExportPathwayPdf()
  const { data: exportData, reset: resetExport } = exportMutation
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const updateOffset = () => {
      const width = container.clientWidth
      container.style.setProperty(
        '--carousel-offset',
        `${Math.max(0, Math.min(activeIndex, semesters.length - 1)) * width}px`,
      )
    }

    updateOffset()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOffset)

      return () => {
        window.removeEventListener('resize', updateOffset)
      }
    }

    const observer = new ResizeObserver(updateOffset)
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [activeIndex, semesters.length])

  const handleExport = () => {
    exportMutation.mutate(plan)
  }

  const sectionClass = isFullscreen
    ? 'flex h-full w-full flex-col gap-8'
    : 'flex w-full flex-1 flex-col gap-8 min-h-[60vh] md:min-h-[70vh]'

  const renderSemesterTabs = (className: string) => (
    <div className={className}>
      {semesters.map(({ semester, yearNumber }, index) => (
        <button
          key={`${yearNumber}-${semester.semester_name}-tab`}
          type="button"
          onClick={() => onSemesterSelect(index)}
          className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            activeIndex === index
              ? 'border-sky-500 bg-sky-500/20 text-sky-200'
              : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-600 hover:text-slate-200'
          }`}
        >
          Year {yearNumber} · {formatSemesterName(semester.semester_name)}
        </button>
      ))}
    </div>
  )

  return (
    <section className={sectionClass}>
      {isFullscreen && (
        <div className="flex items-center gap-4">
          {semesters.length > 1 ? (
            renderSemesterTabs('flex flex-1 items-center gap-2 overflow-x-auto pr-2 pb-2')
          ) : (
            <div className="flex-1" />
          )}
          {onExitFullscreen && (
            <button
              type="button"
              onClick={onExitFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-rose-400 hover:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/60 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Exit fullscreen viewer</span>
            </button>
          )}
        </div>
      )}

      <header className={`space-y-2 ${isFullscreen ? 'text-left' : 'text-center'}`}>
        <div
          className={`inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-sky-300 ${
            isFullscreen ? '' : 'mx-auto'
          }`}
        >
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

      {!!plan.summary && (
        <p
          className={`text-base text-slate-300 ${
            isFullscreen ? 'max-w-3xl text-left' : 'mx-auto max-w-3xl text-center'
          }`}
        >
          {plan.summary}
        </p>
      )}

      {!!plan.candidates?.length && (
        <div
          className={`flex flex-wrap gap-3 ${
            isFullscreen ? 'justify-start' : 'justify-center'
          }`}
        >
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

      <div
        className={`flex flex-wrap items-center gap-3 ${
          isFullscreen ? 'justify-start' : 'justify-center'
        }`}
      >
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
        {!isFullscreen && onRequestFullscreen && (
          <button
            type="button"
            onClick={onRequestFullscreen}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <Maximize className="h-4 w-4" aria-hidden="true" />
            Fullscreen viewer
          </button>
        )}
      </div>

      {exportMutation.isError && (
        <p
          className={`text-xs text-rose-300 ${
            isFullscreen ? 'text-left' : 'text-center'
          }`}
        >
          {exportMutation.error?.message ?? 'Unable to export plan. Please try again.'}
        </p>
      )}

      <div className="relative flex-1">
        <div
          ref={containerRef}
          className="flex h-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60"
        >
          <div
            className="flex h-full w-full transition-transform duration-500 ease-out"
            style={{
              transform: 'translateX(calc(-1 * var(--carousel-offset, 0px)))',
            }}
          >
            {semesters.map(({ semester, yearNumber }, index) => (
              <div
                key={`${yearNumber}-${semester.semester_name}`}
                className="flex h-full w-full flex-shrink-0"
              >
                <SemesterSlide
                  semester={semester}
                  yearNumber={yearNumber}
                  isActive={activeIndex === index}
                  onSelectCourse={onSelectCourse}
                />
              </div>
            ))}
          </div>
        </div>

        {semesters.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              disabled={activeIndex === 0}
              className="group absolute left-0 top-0 flex h-full w-[72px] items-center justify-center rounded-r-2xl border border-slate-800/60 bg-slate-950/60 text-slate-200 shadow-lg transition hover:border-slate-600 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">Previous semester</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              disabled={activeIndex === semesters.length - 1}
              className="group absolute right-0 top-0 flex h-full w-[72px] items-center justify-center rounded-l-2xl border border-slate-800/60 bg-slate-950/60 text-slate-200 shadow-lg transition hover:border-slate-600 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">Next semester</span>
            </button>
          </>
        )}
      </div>

      {!isFullscreen && semesters.length > 1 &&
        renderSemesterTabs('flex flex-wrap justify-center gap-2')}
    </section>
  )
}

function SemesterSlide({
  semester,
  yearNumber,
  isActive,
  onSelectCourse,
}: {
  semester: SemesterPlan_UHCoursePlan__Output
  yearNumber: number
  isActive: boolean
  onSelectCourse: (course: UHCoursePlan_Output | UHCourse) => void
}) {
  return (
    <section
      className={`flex h-full w-full flex-col gap-6 p-8 transition-opacity duration-300 ${
        isActive ? 'opacity-100' : 'opacity-80'
      }`}
    >
      <header className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Semester</p>
        <div className="space-y-2">
          <h3 className="text-3xl font-semibold text-slate-100">
            Year {yearNumber} · {formatSemesterName(semester.semester_name)}
          </h3>
          <p className="text-sm text-slate-400">
            {semester.courses.length} courses · {semester.credits} credits
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-3">
          {semester.courses.map((course, index) => (
            <CourseRow
              key={
                course.course_id ??
                `${course.course_prefix}-${course.course_number}-${index}`
              }
              course={course}
              onSelectCourse={onSelectCourse}
            />
          ))}
        </div>
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
  const hasAlternates = Boolean(course.candidates?.length)
  const displayedDesignations = course.designations?.slice(0, 2) ?? []

  return (
    <button
      type="button"
      onClick={() => onSelectCourse(course)}
      className="w-full rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5 text-left shadow-inner transition hover:border-slate-600 hover:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {course.course_prefix} {course.course_number}
            {course.course_suffix ? ` ${course.course_suffix}` : ''}
          </p>
          <p className="text-lg font-medium text-slate-100">{course.course_title}</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          {credits} credits
        </span>
      </div>

      {course.course_desc && (
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{course.course_desc}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {course.dept_name && (
          <span className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-wide">
            {course.dept_name}
          </span>
        )}
        {displayedDesignations.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-wide"
          >
            {tag}
          </span>
        ))}
        {course.designations && course.designations.length > displayedDesignations.length && (
          <span className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-wide">
            +{course.designations.length - displayedDesignations.length} more
          </span>
        )}
        {hasAlternates && (
          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-semibold uppercase tracking-wide text-sky-200">
            Alternates available
          </span>
        )}
      </div>
    </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
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
