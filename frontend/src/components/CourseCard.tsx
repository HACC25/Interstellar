import type { UHCourse } from "../client/models/UHCourse";
import type { UHCoursePlan_Output } from "../client/models/UHCoursePlan_Output";
import type { CourseSelection } from "../utils/pathway";
import { areCoursesEqual } from "../utils/pathway";

type CourseCardProps = {
  course: UHCoursePlan_Output | UHCourse;
  sourceCourse: UHCoursePlan_Output;
  courseKey: string;
  onSelectCourse: (selection: CourseSelection) => void;
};

export function CourseCard({
                              course,
                              sourceCourse,
                              courseKey,
                              onSelectCourse,
                            }: CourseCardProps) {
  const credits =
    course.num_units.min === course.num_units.max
      ? course.num_units.min
      : `${course.num_units.min}-${course.num_units.max}`;
  const candidateAlternatives =
    sourceCourse.candidates?.filter(
      (candidate) => !areCoursesEqual(candidate, course)
    ) ?? [];
  const hasAlternatives = candidateAlternatives.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            {course.course_prefix} {course.course_number}
            {course.course_suffix ? ` ${course.course_suffix}` : ""}
          </p>
          <h4 className="text-lg font-medium text-slate-100">
            {course.course_title}
          </h4>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          {credits} credits
        </span>
      </div>

      <p className="text-sm leading-relaxed text-slate-400">
        {course.course_desc}
      </p>

      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-slate-800 px-3 py-1 uppercase tracking-wide">
          {course.dept_name}
        </span>
        {!!course.designations?.length &&
          course.designations.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-800/80 px-3 py-1 uppercase tracking-wide text-slate-300"
            >
              {tag}
            </span>
          ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectCourse({ course, sourceCourse, courseKey })}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          View details
        </button>
        {hasAlternatives && (
          <span className="self-center text-xs uppercase tracking-wide text-slate-500">
            Alternatives available
          </span>
        )}
      </div>
    </div>
  );
}
