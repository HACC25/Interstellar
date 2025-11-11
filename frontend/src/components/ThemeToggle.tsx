import { Moon, Sun } from "lucide-react";

import type { Theme } from "../utils/pathway";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="inline-flex items-center gap-3 rounded-full border border-slate-800/60 bg-slate-950/50 px-4 py-2 text-sm font-semibold text-slate-100 shadow-inner transition hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
    >
      <Sun
        className={`h-4 w-4 transition ${isDark ? "text-slate-500" : "text-amber-400"}`}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {isDark ? "Dark" : "Light"} mode
      </span>
      <div className="relative h-6 w-12 rounded-full border border-slate-800/70 bg-slate-950/60">
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow transition ${
            isDark ? "translate-x-5 bg-slate-800" : "translate-x-0 bg-white"
          }`}
        />
      </div>
      <Moon
        className={`h-4 w-4 transition ${isDark ? "text-sky-200" : "text-slate-500"}`}
        aria-hidden="true"
      />
    </button>
  );
}
