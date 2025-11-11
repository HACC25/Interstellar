import { CheckCircle2, Eye } from "lucide-react";

import type { DegreePathwayBase_PathwayCourse_ } from "../client/models/DegreePathwayBase_PathwayCourse_";

type PathwayResultCardProps = {
  pathway: DegreePathwayBase_PathwayCourse_;
  isSelected: boolean;
  onSelect: (pathway: DegreePathwayBase_PathwayCourse_) => void;
  onPreview: (pathwayId: string) => void;
};

export function PathwayResultCard({
                                    pathway,
                                    isSelected,
                                    onSelect,
                                    onPreview,
                                  }: PathwayResultCardProps) {
  const pathwayId = pathway.pathway_id;
  const yearCount = pathway.years?.length ?? 0;

  return (
    <article
      className={`rounded-2xl border p-4 shadow-inner ${
        isSelected
          ? "border-sky-400 bg-sky-500/5"
          : "border-slate-800/70 bg-slate-950/40"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="md:w-3/4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {pathway.institution}
          </p>
          <h3 className="text-lg font-semibold text-slate-50">
            {pathway.program_name}
          </h3>
          <p className="text-sm text-slate-400">
            {pathway.total_credits} credits · {yearCount} year
            {yearCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-1/4">
          <button
            type="button"
            disabled={!pathwayId}
            onClick={() => pathwayId && onSelect(pathway)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed ${
              isSelected
                ? "border border-sky-400 bg-sky-500/20 text-sky-100"
                : "border border-slate-700 text-slate-200 hover:border-slate-500"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isSelected ? "Selected" : "Use pathway"}
          </button>
          <button
            type="button"
            disabled={!pathwayId}
            onClick={() => pathwayId && onPreview(pathwayId)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            View details
          </button>
        </div>
      </div>
    </article>
  );
}
