import { createFileRoute } from "@tanstack/react-router";
import {
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Maximize,
  Moon,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

import type { CompleteDegreePathway_Output } from "../client/models/CompleteDegreePathway_Output";
import type { DegreePathwayBase_PathwayCourse_ } from "../client/models/DegreePathwayBase_PathwayCourse_";
import type { SemesterPlan_UHCoursePlan__Output } from "../client/models/SemesterPlan_UHCoursePlan__Output";
import type { UHCourse } from "../client/models/UHCourse";
import type { UHCoursePlan_Output } from "../client/models/UHCoursePlan_Output";
import { useExportPathwayPdf } from "../hooks/useExportPathwayPdf";
import { usePredictDegreePathway } from "../hooks/usePredictDegreePathway";
import { usePredictDegreePathwayById } from "../hooks/usePredictDegreePathwayById";
import { usePathwayById } from "../hooks/usePathwayById";
import { usePathwaySimilarSearch } from "../hooks/usePathwaySimilarSearch";
import { usePathwayTextSearch } from "../hooks/usePathwayTextSearch";

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

type CourseSelection = {
  course: UHCoursePlan_Output | UHCourse;
  sourceCourse: UHCoursePlan_Output;
  courseKey: string;
};

type CourseOverrides = Record<string, UHCourse>;

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "degree-pathway:theme";

export const Route = createFileRoute("/")({
  component: AppV2,
});

const PENDING_MESSAGES = [
  "Analyzing your preferences",
  "Creating college plan",
];

function AppV2() {
  const [message, setMessage] = useState("");
  const [storedPlan, setStoredPlan] =
    useState<CompleteDegreePathway_Output | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CourseSelection | null>(
    null
  );
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [courseOverrides, setCourseOverrides] = useState<CourseOverrides>({});
  const [hydratedPlanId, setHydratedPlanId] = useState<string | null>(null);
  const [pathwayInput, setPathwayInput] = useState("");
  const [pathwayQuery, setPathwayQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"text" | "similar">("text");
  const [selectedPathway, setSelectedPathway] =
    useState<DegreePathwayBase_PathwayCourse_ | null>(null);
  const [previewPathwayId, setPreviewPathwayId] = useState<string | null>(null);
  const [confirmPathwayId, setConfirmPathwayId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [theme, setTheme] = useState<Theme>("dark");
  const [hasUserThemeOverride, setHasUserThemeOverride] = useState(false);

  const prediction = usePredictDegreePathway();
  const predictionById = usePredictDegreePathwayById();
  const textSearch = usePathwayTextSearch(pathwayQuery, {
    enabled: searchMode === "text",
  });
  const similarSearch = usePathwaySimilarSearch(pathwayQuery, {
    enabled: searchMode === "similar",
  });
  const activeSearch = searchMode === "text" ? textSearch : similarSearch;

  const planToShow = predictionById.data ?? prediction.data ?? storedPlan;
  const predictionError = predictionById.error ?? prediction.error ?? null;
  const isPredicting = predictionById.isPending || prediction.isPending;
  const pathwayResults = pathwayQuery ? (activeSearch.data ?? []) : [];
  const isSearchingPathways = activeSearch.isFetching;
  const searchError = (activeSearch.error as Error | null) ?? null;
  const planIdentifier = useMemo(
    () => (planToShow ? getPlanIdentifier(planToShow) : null),
    [planToShow]
  );
  const planWithOverrides = useMemo(() => {
    if (!planToShow) {
      return null;
    }

    if (!Object.keys(courseOverrides).length) {
      return planToShow;
    }

    return applyCourseOverrides(planToShow, courseOverrides);
  }, [planToShow, courseOverrides]);

  const exportMutation = useExportPathwayPdf();
  const { data: exportData, reset: resetExport } = exportMutation;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      setHasUserThemeOverride(true);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mediaQuery.matches ? "dark" : "light");

    const handleMediaChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    return () => {
      root.classList.remove("dark");
    };
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasUserThemeOverride) {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, hasUserThemeOverride]);

  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem("degree-pathway:last-plan");
      const savedMessage = localStorage.getItem("degree-pathway:last-message");

      if (savedPlan) {
        setStoredPlan(JSON.parse(savedPlan) as CompleteDegreePathway_Output);
      }

      if (savedMessage) {
        setMessage(savedMessage);
      }
    } catch (error) {
      console.error("Failed to restore saved pathway plan", error);
    }
  }, []);

  useEffect(() => {
    const latestPlan = predictionById.data ?? prediction.data;
    if (!latestPlan) {
      return;
    }

    try {
      localStorage.setItem(
        "degree-pathway:last-plan",
        JSON.stringify(latestPlan)
      );
      setStoredPlan(latestPlan);
    } catch (error) {
      console.error("Failed to persist pathway plan", error);
    }
  }, [prediction.data, predictionById.data]);

  useEffect(() => {
    try {
      if (message) {
        localStorage.setItem("degree-pathway:last-message", message);
      } else {
        localStorage.removeItem("degree-pathway:last-message");
      }
    } catch (error) {
      console.error("Failed to persist pathway message", error);
    }
  }, [message]);

  useEffect(() => {
    if (!planIdentifier) {
      setCourseOverrides({});
      setHydratedPlanId(null);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      const storageKey = getOverridesStorageKey(planIdentifier);
      const storedOverrides = localStorage.getItem(storageKey);
      const parsedOverrides = storedOverrides
        ? (JSON.parse(storedOverrides) as CourseOverrides)
        : {};
      const safeOverrides: CourseOverrides =
        parsedOverrides && typeof parsedOverrides === "object"
          ? parsedOverrides
          : {};
      setCourseOverrides(safeOverrides);
      setHydratedPlanId(planIdentifier);
    } catch (error) {
      console.error("Failed to restore course overrides", error);
      setCourseOverrides({});
      setHydratedPlanId(planIdentifier);
    }
  }, [planIdentifier]);

  useEffect(() => {
    if (
      !planIdentifier ||
      hydratedPlanId !== planIdentifier ||
      typeof window === "undefined"
    ) {
      return;
    }

    try {
      const storageKey = getOverridesStorageKey(planIdentifier);
      if (Object.keys(courseOverrides).length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(courseOverrides));
      }
    } catch (error) {
      console.error("Failed to persist course overrides", error);
    }
  }, [planIdentifier, hydratedPlanId, courseOverrides]);

  useEffect(() => {
    setSelectedCourse(null);
  }, [planIdentifier]);

  useEffect(() => {
    if (!isPredicting) {
      setStatusIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setStatusIndex((index) => (index + 1) % PENDING_MESSAGES.length);
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPredicting]);

  useEffect(() => {
    if (!planToShow) {
      setIsViewerOpen(false);
    }
  }, [planToShow]);

  useEffect(() => {
    if (prediction.isSuccess) {
      setUploadedFiles([]);
    }
  }, [prediction.isSuccess]);

  useEffect(() => {
    if (!exportData) {
      return;
    }

    const { blob, filename } = exportData;
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    resetExport();
  }, [exportData, resetExport]);

  useEffect(() => {
    if (!isViewerOpen || typeof document === "undefined") {
      return;
    }

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isViewerOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedPathway?.pathway_id) {
      predictionById.mutate({ pathwayId: selectedPathway.pathway_id, message });
      return;
    }

    prediction.mutate({
      message,
      files: uploadedFiles,
    });
  };

  const handleCourseSelect = (selection: CourseSelection) => {
    setSelectedCourse(selection);
  };

  const handleSwapCourse = useCallback(
    (courseKey: string, replacement: UHCourse | null) => {
      setCourseOverrides((prev) => {
        if (!replacement) {
          if (!(courseKey in prev)) {
            return prev;
          }

          const { [courseKey]: _removed, ...rest } = prev;
          return rest;
        }

        if (prev[courseKey] === replacement) {
          return prev;
        }

        return {
          ...prev,
          [courseKey]: replacement,
        };
      });

      setSelectedCourse((current) => {
        if (!current || current.courseKey !== courseKey) {
          return current;
        }

        if (!replacement) {
          return {
            ...current,
            course: current.sourceCourse,
          };
        }

        return {
          ...current,
          course: replacement,
        };
      });
    },
    []
  );

  const handleCloseDetail = () => {
    setSelectedCourse(null);
  };

  const handlePathwaySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPathwayQuery(pathwayInput.trim());
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) {
      return;
    }

    setUploadedFiles((current) => {
      const existingKeys = new Set(current.map(getFileKey));
      const nextFiles = files.filter(
        (file) => !existingKeys.has(getFileKey(file))
      );
      if (!nextFiles.length) {
        return current;
      }

      return [...current, ...nextFiles];
    });

    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) =>
      prev.filter((_, fileIndex) => fileIndex !== index)
    );
  };

  const handleSelectPathway = (pathway: DegreePathwayBase_PathwayCourse_) => {
    if (!pathway.pathway_id) {
      return;
    }

    setSelectedPathway(pathway);
  };

  const handleClearSelectedPathway = () => {
    setSelectedPathway(null);
  };

  const handleCandidatePathwayClick = (pathwayId: string) => {
    if (!pathwayId) {
      return;
    }

    setConfirmPathwayId(pathwayId);
  };

  const handleConfirmCandidate = (pathwayId: string) => {
    predictionById.mutate({ pathwayId, message });
    setConfirmPathwayId(null);
  };

  const handleExportPlan = () => {
    if (!planWithOverrides) {
      return;
    }

    exportMutation.mutate(planWithOverrides);
  };

  const handleThemeToggle = () => {
    setHasUserThemeOverride(true);
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  };

  const backgroundLayers = useMemo<Record<Theme, CSSProperties>>(
    () => ({
      dark: {
        backgroundImage: "url(/hawaii-night.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        filter: "blur(10px)",
        transform: "scale(1.05)",
        backgroundColor: "#020617",
      },
      light: {
        backgroundImage: "url(/hawaii.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        filter: "blur(10px)",
        transform: "scale(1.05)",
        backgroundColor: "#f8fafc",
      },
    }),
    []
  );

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center px-4 py-12 ${
        theme === "dark"
          ? "theme-dark text-slate-100"
          : "theme-light text-slate-900"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            theme === "dark" ? "opacity-100" : "opacity-0"
          }`}
          style={backgroundLayers.dark}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            theme === "light" ? "opacity-100" : "opacity-0"
          }`}
          style={backgroundLayers.light}
        />
      </div>
      {isPredicting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-slate-800 bg-slate-950/80 px-12 py-10 shadow-2xl">
            <Loader2 className="h-16 w-16 animate-spin text-sky-400" />
            <div className="space-y-2 text-center">
              <p className="text-base font-semibold uppercase tracking-[0.3em] text-slate-400">
                Launching plan
              </p>
              <p className="text-xl text-slate-100">
                {PENDING_MESSAGES[statusIndex]}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-5xl">
        <nav className="mb-6 flex items-center justify-between rounded-2xl border border-slate-800/60 bg-slate-950/60 px-6 py-4 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-2 text-sky-300">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Mission control
              </p>
              <p className="text-base font-semibold text-slate-100">
                Pathway studio
              </p>
            </div>
          </div>
          <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
        </nav>

        <div
          className={`relative z-10 space-y-10 rounded-[32px] border-2 bg-slate-900/70 p-10 shadow-2xl backdrop-blur ${
            theme === "dark" ? "border-slate-800/60" : "border-sky-400/70"
          }`}
        >
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
              Describe a student&apos;s goals, strengths, or constraints and
              we&apos;ll build a personalized academic pathway that keeps them
              on course.
            </p>
          </header>

          <section className="space-y-5 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-inner">
            <header className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Choose a template (optional)
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Search university pathways
              </h2>
              <p className="text-sm text-slate-400">
                Start from an official UH pathway and customize it, or skip this
                step for a fully generated plan.
              </p>
            </header>

            <div className="flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                onClick={() => setSearchMode("text")}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  searchMode === "text"
                    ? "border-sky-500 bg-sky-500/10 text-sky-200"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Quick text search
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("similar")}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  searchMode === "similar"
                    ? "border-sky-500 bg-sky-500/10 text-sky-200"
                    : "border-slate-700 text-slate-400"
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPredicting}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Search pathways
              </button>
            </form>

            {selectedPathway ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-slate-100 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                    Selected
                  </p>
                  <p className="text-base font-semibold">
                    {selectedPathway.program_name}
                  </p>
                  <p className="text-sm text-slate-300">
                    {selectedPathway.institution}
                  </p>
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
                No pathway selected. We&apos;ll build a plan from scratch unless
                you pick one.
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
                    <Loader2
                      className="h-4 w-4 animate-spin text-sky-400"
                      aria-hidden="true"
                    />
                    Searching pathways for “{pathwayQuery}”…
                  </div>
                ) : pathwayResults.length ? (
                  pathwayResults.map((pathway) => (
                    <PathwayResultCard
                      key={`${pathway.pathway_id ?? pathway.program_name}`}
                      pathway={pathway}
                      isSelected={
                        pathway.pathway_id === selectedPathway?.pathway_id
                      }
                      onSelect={handleSelectPathway}
                      onPreview={(pathwayId) => setPreviewPathwayId(pathwayId)}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    No pathways found for “{pathwayQuery}”. Try another keyword
                    or switch search modes.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Enter a keyword to browse matching pathways. Text search is
                instant; comprehensive search digs deeper but may take longer.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-800/70 bg-slate-950/60 p-6 shadow-inner">
            <header className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Describe your goals
              </p>
              <h2 className="text-xl font-semibold text-slate-50">
                Launch a personalized plan
              </h2>
              <p className="text-sm text-slate-400">
                Share your interests and goals. We&apos;ll generate or refine
                the pathway using this context.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="supporting-files"
                    className="text-sm font-semibold text-slate-200"
                  >
                    Attach supporting files{" "}
                    <span className="font-normal text-slate-500">
                      (optional)
                    </span>
                  </label>
                  <p className="text-xs text-slate-500">
                    PDF, DOCX, or TXT transcripts, syllabi, or transfer
                    evaluations help tailor your plan.
                  </p>
                </div>
                <input
                  id="supporting-files"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileInputChange}
                  disabled={isPredicting}
                  className="block w-full cursor-pointer rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-4 text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100 hover:border-slate-700 disabled:cursor-not-allowed"
                />

                {uploadedFiles.length > 0 && (
                  <ul className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100"
                      >
                        <div className="flex flex-1 items-center gap-3">
                          <Paperclip
                            className="h-4 w-4 text-slate-500"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-medium text-slate-50">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-rose-400 hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:ring-offset-2 focus:ring-offset-slate-950"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-xs text-slate-500">
                  Files are only processed when launching a new plan (not when
                  refining a saved pathway).
                </p>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
                <span>
                  Tip: mention preferred subjects, transfer credits, or time
                  constraints for a sharper plan.
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPredicting}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {selectedPathway ? "Refine this pathway" : "Launch plan"}
                </button>
              </div>
            </form>
          </section>

          {predictionError && (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {predictionError.message ??
                "Something went wrong. Please try again."}
            </p>
          )}

          {planToShow ? (
            <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/40 p-8">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Here is the best pathway for you
                </p>
                <h2 className="text-3xl font-semibold text-slate-50">
                  {planToShow.program_name}
                </h2>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  {planToShow.institution} &middot; {planToShow.total_credits}{" "}
                  credits
                </p>
              </div>
              <p className="whitespace-pre-line text-base leading-relaxed text-slate-300">
                {planToShow.summary}
              </p>
              {!!planToShow.candidates?.length && (
                <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Similar pathways
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {planToShow.candidates.map((candidate) => (
                      <button
                        key={candidate.pathway_id}
                        type="button"
                        onClick={() =>
                          handleCandidatePathwayClick(candidate.pathway_id)
                        }
                        className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-500 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
                      >
                        {candidate.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleExportPlan}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Preparing PDF…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Export Plan
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewerOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
                >
                  <Maximize className="h-4 w-4" aria-hidden="true" />
                  View Pathway Fullscreen
                </button>
              </div>
              {exportMutation.isError && (
                <p className="text-sm text-rose-300">
                  {exportMutation.error?.message ??
                    "Unable to export plan. Please try again."}
                </p>
              )}
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-800/80 bg-slate-950/40 p-10 text-center text-slate-400">
              Your pathway plan will appear here with semester-by-semester
              guidance.
            </div>
          )}
        </div>
      </div>

      {isViewerOpen && planToShow && (
        <FullscreenViewer
          plan={planToShow}
          onClose={() => setIsViewerOpen(false)}
          onSelectCourse={handleCourseSelect}
          courseOverrides={courseOverrides}
          onGeneratePathway={handleCandidatePathwayClick}
        />
      )}

      {selectedCourse && (
        <CourseDetail
          selection={selectedCourse}
          onClose={handleCloseDetail}
          onSelectCourse={handleCourseSelect}
          onSwapCourse={handleSwapCourse}
        />
      )}

      {previewPathwayId && (
        <PathwayPreview
          pathwayId={previewPathwayId}
          onClose={() => setPreviewPathwayId(null)}
          onSelect={(pathway) => {
            handleSelectPathway(pathway);
            setPreviewPathwayId(null);
          }}
        />
      )}

      {confirmPathwayId && (
        <PathwayConfirmModal
          pathwayId={confirmPathwayId}
          onCancel={() => setConfirmPathwayId(null)}
          onConfirm={handleConfirmCandidate}
        />
      )}
    </div>
  );
}

function ThemeToggle({
                       theme,
                       onToggle,
                     }: {
  theme: Theme;
  onToggle: () => void;
}) {
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

function PathwayResultCard({
                             pathway,
                             isSelected,
                             onSelect,
                             onPreview,
                           }: {
  pathway: DegreePathwayBase_PathwayCourse_;
  isSelected: boolean;
  onSelect: (pathway: DegreePathwayBase_PathwayCourse_) => void;
  onPreview: (pathwayId: string) => void;
}) {
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

function PathwayPreview({
                          pathwayId,
                          onClose,
                          onSelect,
                        }: {
  pathwayId: string;
  onClose: () => void;
  onSelect: (pathway: DegreePathwayBase_PathwayCourse_) => void;
}) {
  const { data, isFetching, isError, error } = usePathwayById(pathwayId);
  const handleUsePathway = () => {
    if (data) {
      onSelect(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
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
                    {year.semesters.map((semester, index) => {
                      const prettyName =
                        semester.semester_name.charAt(0).toUpperCase() +
                        semester.semester_name.slice(1);

                      return (
                        <div
                          key={`${year.year_number}-${semester.semester_name}-${index}`}
                          className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-3"
                        >
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            {prettyName}
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
                      );
                    })}
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
  );
}

function PathwayConfirmModal({
                               pathwayId,
                               onCancel,
                               onConfirm,
                             }: {
  pathwayId: string;
  onCancel: () => void;
  onConfirm: (pathwayId: string) => void;
}) {
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

function FullscreenViewer({
                            plan,
                            onClose,
                            onSelectCourse,
                            courseOverrides,
                            onGeneratePathway,
                          }: {
  plan: CompleteDegreePathway_Output;
  onClose: () => void;
  onSelectCourse: (selection: CourseSelection) => void;
  courseOverrides: CourseOverrides;
  onGeneratePathway: (pathwayId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
          <div className="border-t border-slate-800 bg-slate-950/80 px-6">
            <div className="flex gap-2 overflow-x-auto py-3">
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
              className="absolute left-6 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/80 p-3 text-slate-200 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Previous page</span>
            </button>
          )}

          {activeIndex < pages.length - 1 && (
            <button
              type="button"
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="absolute right-6 top-1/2 z-20 -translate-y-1/2 rounded-full border border-slate-700 bg-slate-900/80 p-3 text-slate-200 transition hover:border-sky-500 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Next page</span>
            </button>
          )}

          <div
            ref={containerRef}
            className="h-full min-h-0 w-full overflow-x-auto overflow-y-hidden scroll-smooth"
            style={{ scrollSnapType: "x mandatory" }}
          >
            <div className="flex h-full">
              {pages.map((page) => {
                if (page.type === "overview") {
                  return (
                    <div
                      key={page.key}
                      className="flex h-full min-h-0 w-full min-w-full flex-col gap-6 overflow-y-auto p-10"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div className="space-y-3">
                        <h3 className="text-3xl font-semibold text-slate-50">
                          {plan.program_name}
                        </h3>
                        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                          {plan.institution} &middot; {plan.total_credits}{" "}
                          credits
                        </p>
                      </div>
                      <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                          Summary
                        </p>
                        <p className="whitespace-pre-line text-base leading-relaxed text-slate-300">
                          {plan.summary}
                        </p>
                      </div>
                      {!!plan.candidates?.length && (
                        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
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
                    className="flex h-full min-h-0 w-full min-w-full flex-col gap-6 overflow-y-auto p-10"
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
                      <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center text-slate-400">
                        No courses for{" "}
                        {formatSemesterName(semester.semester_name)}.
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

function CourseCard({
                      course,
                      sourceCourse,
                      courseKey,
                      onSelectCourse,
                    }: {
  course: UHCoursePlan_Output | UHCourse;
  sourceCourse: UHCoursePlan_Output;
  courseKey: string;
  onSelectCourse: (selection: CourseSelection) => void;
}) {
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

function CourseDetail({
                        selection,
                        onClose,
                        onSelectCourse,
                        onSwapCourse,
                      }: {
  selection: CourseSelection;
  onClose: () => void;
  onSelectCourse: (selection: CourseSelection) => void;
  onSwapCourse: (courseKey: string, replacement: UHCourse | null) => void;
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
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
            <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
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
  );
}

const formatSemesterName = (
  name: SemesterPlan_UHCoursePlan__Output["semester_name"]
): string => name.charAt(0).toUpperCase() + name.slice(1);

const buildCourseKey = (
  yearNumber: number,
  semesterName: SemesterPlan_UHCoursePlan__Output["semester_name"],
  courseIndex: number,
  course: UHCoursePlan_Output
): string => {
  const suffix = course.course_suffix ?? "base";
  const identifier =
    course.course_id ??
    `${course.course_prefix}-${course.course_number}-${suffix}`;

  return `${yearNumber}-${semesterName}-${courseIndex}-${identifier}`;
};

const areCoursesEqual = (
  first: UHCoursePlan_Output | UHCourse,
  second: UHCoursePlan_Output | UHCourse
): boolean => {
  if (first.course_id && second.course_id) {
    return first.course_id === second.course_id;
  }

  return (
    first.course_prefix === second.course_prefix &&
    first.course_number === second.course_number &&
    (first.course_suffix ?? "") === (second.course_suffix ?? "")
  );
};

const applyCourseOverrides = (
  plan: CompleteDegreePathway_Output,
  overrides: CourseOverrides
): CompleteDegreePathway_Output => {
  if (!Object.keys(overrides).length) {
    return plan;
  }

  return {
    ...plan,
    years: plan.years.map((year) => ({
      ...year,
      semesters: year.semesters.map((semester) => ({
        ...semester,
        courses: semester.courses.map((course, index) => {
          const courseKey = buildCourseKey(
            year.year_number,
            semester.semester_name,
            index,
            course
          );
          const override = overrides[courseKey];
          if (!override) {
            return course;
          }

          return {
            ...course,
            ...override,
          };
        }),
      })),
    })),
  };
};

const OVERRIDES_STORAGE_PREFIX = "degree-pathway:course-overrides:";

const getPlanIdentifier = (plan: CompleteDegreePathway_Output): string => {
  if (plan.pathway_id) {
    return plan.pathway_id;
  }

  const yearFingerprint = plan.years
    .map(
      (year) =>
        `${year.year_number}:${year.semesters
          .map(
            (semester) =>
              `${semester.semester_name}:${semester.courses
                .map((course, index) =>
                  buildCourseKey(
                    year.year_number,
                    semester.semester_name,
                    index,
                    course
                  )
                )
                .join(",")}`
          )
          .join("|")}`
    )
    .join("~");

  return `${plan.program_name}|${plan.institution}|${yearFingerprint}`;
};

const getOverridesStorageKey = (planIdentifier: string): string =>
  `${OVERRIDES_STORAGE_PREFIX}${encodeURIComponent(planIdentifier)}`;

const getFileKey = (file: File): string =>
  `${file.name}-${file.size}-${file.lastModified}`;

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }

  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }

  return `${bytes} B`;
};
