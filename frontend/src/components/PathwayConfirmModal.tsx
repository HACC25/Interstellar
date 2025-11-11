import { CheckCircle2, Loader2 } from "lucide-react";

import { usePathwayById } from "../hooks/usePathwayById";
import { formatSemesterName } from "../utils/pathway";

type PathwayConfirmModalProps = {
  pathwayId: string;
  onCancel: () => void;
  onConfirm: (pathwayId: string) => void;
};

export function PathwayConfirmModal({
                                      pathwayId,
                                      onCancel,
                                      onConfirm,
                                    }: PathwayConfirmModalProps) {
  const { data, isFetching, isError, error } = usePathwayById(pathwayId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
      <div className="relative w-full max-w-3xl space-y-6 rounded-3xl border border-slate-800 bg-slate-950/90 p-8 text-slate-100 shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-6 top-6 text-sm font-semibold uppercase tracking-wide text-slate-400 transition hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Close
        </button>

        {isFetching && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <Loader2
              className="h-4 w-4 animate-spin text-sky-400"
              aria-hidden="true"
            />
            Loading pathway…
          </div>
        )}

        {isError && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {(error as Error | undefined)?.message ??
              "Unable to load pathway details."}
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

            <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-2">
              {data.years.map((year) => (
                <article
                  key={year.year_number}
                  className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4"
                >
                  <p className="text-sm font-semibold text-slate-200">
                    Year {year.year_number}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {year.semesters.map((semester, index) => (
                      <div
                        key={`${year.year_number}-${semester.semester_name}-${index}`}
                        className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-3"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                          {formatSemesterName(semester.semester_name)}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-300">
                          {semester.courses.map((course, courseIndex) => (
                            <li key={`${course.name}-${courseIndex}`}>
                              <span className="font-medium text-slate-100">
                                {course.name}
                              </span>
                              <span className="text-slate-400">
                                {" "}
                                · {course.credits} credits
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <p className="text-sm text-slate-300">
              Generating from this pathway will refresh the current plan using
              your existing prompt.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-slate-300 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(pathwayId)}
                className="inline-flex items-center gap-2 rounded-full border border-sky-400 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-sky-100 transition hover:bg-sky-400/10 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Generate plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
