import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { CompleteDegreePathway_Output } from "../client/models/CompleteDegreePathway_Output";
import type { SemesterPlan_UHCoursePlan__Output } from "../client/models/SemesterPlan_UHCoursePlan__Output";
import type { CourseOverrides, CourseSelection } from "../utils/pathway";
import { buildCourseKey, formatSemesterName } from "../utils/pathway";
import { CourseCard } from "./CourseCard";

type ViewerPage =
  | {
  key: string;
  label: string;
  type: "overview";
}
  | {
  key: string;
  label: string;
  type: "semester";
  yearNumber: number;
  semester: SemesterPlan_UHCoursePlan__Output;
};

type FullscreenViewerProps = {
  plan: CompleteDegreePathway_Output;
  onClose: () => void;
  onSelectCourse: (selection: CourseSelection) => void;
  courseOverrides: CourseOverrides;
  onGeneratePathway: (pathwayId: string) => void;
};

export function FullscreenViewer({
                                    plan,
                                    onClose,
                                    onSelectCourse,
                                    courseOverrides,
                                    onGeneratePathway,
                                  }: FullscreenViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pendingScrollIndex = useRef<number | null>(null);

  const pages = useMemo<ViewerPage[]>(() => {
    const overviewPage: ViewerPage = {
      key: "overview",
      label: "Overview",
      type: "overview",
    };

    const semesterPages = plan.years.flatMap<ViewerPage>((year) =>
      year.semesters
        .filter((semester) => (semester.credits ?? 0) > 0)
        .map((semester) => ({
          key: `${year.year_number}-${semester.semester_name}`,
          label: `Year ${year.year_number} · ${formatSemesterName(semester.semester_name)}`,
          type: "semester",
          yearNumber: year.year_number,
          semester,
        }))
    );

    return [overviewPage, ...semesterPages];
  }, [plan]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const clamped = Math.max(0, Math.min(index, pages.length - 1));
      setActiveIndex(clamped);
      pendingScrollIndex.current = behavior === "smooth" ? clamped : null;

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const { clientWidth } = container;
      container.scrollTo({
        left: clientWidth * clamped,
        behavior,
      });
    },
    [pages.length]
  );

  const handleTabClick = (index: number) => {
    scrollToIndex(index);
  };

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const { scrollLeft, clientWidth } = container;
    if (clientWidth === 0) {
      return;
    }

    if (pendingScrollIndex.current !== null) {
      const target = pendingScrollIndex.current;
      const targetOffset = clientWidth * target;
      if (Math.abs(scrollLeft - targetOffset) <= 1) {
        pendingScrollIndex.current = null;
      }
      return;
    }

    const nextIndex = Math.round(scrollLeft / clientWidth);
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let frame: number | null = null;

    const onScroll = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        handleScroll();
      });
    };

    container.addEventListener("scroll", onScroll);

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    scrollToIndex(0, "auto");
  }, [pages.length, scrollToIndex]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [activeIndex, scrollToIndex]);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/95 text-slate-100 backdrop-blur">
      <div className="flex h-full min-h-0 flex-col">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Pathway Fullscreen Viewer
              </p>
              <h2 className="text-lg font-semibold text-slate-100">
                {plan.program_name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-slate-500 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Close
            </button>
          </div>
          <div className="border-t border-slate-800 bg-slate-950/80 px-4 sm:px-6">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
              {pages.map((page, index) => (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => handleTabClick(index)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    activeIndex === index
                      ? "bg-sky-500 text-slate-950"
                      : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  {page.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 bg-slate-950">
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-200 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 sm:left-6 sm:p-3"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Previous page</span>
            </button>
          )}

          {activeIndex < pages.length - 1 && (
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-200 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 sm:right-6 sm:p-3"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Next page</span>
            </button>
          )}

          <div
            ref={containerRef}
            className="h-full min-h-0 w-full overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-hide"
            style={{ scrollSnapType: "x mandatory" }}
          >
            <div className="flex h-full w-full min-w-full">
              {pages.map((page) => {
                if (page.type === "overview") {
                  return (
                    <div
                      key={page.key}
                      className="flex h-full min-h-0 w-full min-w-full flex-col gap-4 overflow-y-auto p-6 scrollbar-hide sm:gap-6 sm:p-8 lg:p-10"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div className="space-y-3">
                        <h3 className="text-3xl font-semibold text-slate-50">
                          {plan.program_name}
                        </h3>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                          {plan.institution} &middot; {plan.total_credits} credits
                        </p>
                      </div>
                      <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                          Summary
                        </p>
                        <p className="whitespace-pre-line text-base leading-relaxed text-slate-300">
                          {plan.summary}
                        </p>
                      </div>
                      {!!plan.candidates?.length && (
                        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Similar Pathways
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {plan.candidates.map((candidate) => (
                              <button
                                key={candidate.pathway_id}
                                type="button"
                                onClick={() =>
                                  onGeneratePathway(candidate.pathway_id)
                                }
                                className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-500 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                              >
                                {candidate.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                const { semester, yearNumber } = page;
                const hasCourses = semester.courses.length > 0;

                return (
                  <div
                    key={page.key}
                    className="flex h-full min-h-0 w-full min-w-full flex-col gap-4 overflow-y-auto p-6 scrollbar-hide sm:gap-6 sm:p-8 lg:p-10"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Year {yearNumber}
                      </p>
                      <h3 className="text-2xl font-semibold text-slate-50">
                        {formatSemesterName(semester.semester_name)}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {semester.credits} credits planned
                      </p>
                    </div>

                    {hasCourses ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {semester.courses.map((course, index) => {
                          const courseKey = buildCourseKey(
                            page.yearNumber,
                            semester.semester_name,
                            index,
                            course
                          );
                          const activeCourse =
                            courseOverrides[courseKey] ?? course;

                          return (
                            <CourseCard
                              key={course.course_id ?? courseKey}
                              course={activeCourse}
                              sourceCourse={course}
                              courseKey={courseKey}
                              onSelectCourse={onSelectCourse}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/60 p-6 text-center text-slate-400">
                        No courses for {formatSemesterName(semester.semester_name)}.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
