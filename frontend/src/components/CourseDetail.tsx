import type { UHCourse } from "../client/models/UHCourse";
import type { CourseSelection } from "../utils/pathway";
import { areCoursesEqual } from "../utils/pathway";

type CourseDetailProps = {
  selection: CourseSelection;
  onClose: () => void;
  onSelectCourse: (selection: CourseSelection) => void;
  onSwapCourse: (courseKey: string, replacement: UHCourse | null) => void;
};

export function CourseDetail({
                               selection,
                               onClose,
                               onSelectCourse,
                               onSwapCourse,
                             }: CourseDetailProps) {
  const { course, sourceCourse, courseKey } = selection;
  const credits =
    course.num_units.min === course.num_units.max
      ? course.num_units.min
      : `${course.num_units.min}-${course.num_units.max}`;
  const isUsingAlternate = !areCoursesEqual(course, sourceCourse);
  const candidateCourses =
    sourceCourse.candidates?.filter(
      (candidate) => !areCoursesEqual(candidate, course)
    ) ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4 backdrop-blur sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="relative w-full max-w-2xl space-y-6 rounded-3xl border border-slate-800 bg-slate-950/90 p-6 text-slate-100 shadow-2xl sm:p-8">
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
              {course.course_suffix ? ` ${course.course_suffix}` : ""}
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

          {isUsingAlternate && (
            <button
              type="button"
              onClick={() => onSwapCourse(courseKey, null)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Restore original course
            </button>
          )}

          <p className="text-sm leading-relaxed text-slate-300">
            {course.course_desc}
          </p>

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

          {course.metadata && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Additional Information
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-300">
                {course.metadata}
              </p>
            </div>
          )}

          {candidateCourses.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Candidate Courses
              </p>
              <div className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto pr-1 scrollbar-hide">
                {candidateCourses.map((candidate) => (
                  <div
                    key={
                      candidate.course_id ??
                      `${candidate.course_prefix}-${candidate.course_number}-${candidate.course_suffix ?? "base"}`
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="space-y-1 text-sm text-slate-200">
                      <span className="font-semibold">
                        {candidate.course_prefix} {candidate.course_number}
                        {candidate.course_suffix
                          ? ` ${candidate.course_suffix}`
                          : ""}
                      </span>
                      <p className="text-slate-400">{candidate.course_title}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectCourse({
                            course: candidate,
                            sourceCourse,
                            courseKey,
                          })
                        }
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                      >
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwapCourse(courseKey, candidate)}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                      >
                        Use this course
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
