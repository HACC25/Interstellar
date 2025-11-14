import { createFileRoute } from "@tanstack/react-router";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Download,
  Loader2,
  Maximize,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import type { CompleteDegreePathway_Output } from "@/client";
import type { DegreePathwayBase_PathwayCourse_ } from "../client/models/DegreePathwayBase_PathwayCourse_";
import type { UHCourse } from "../client/models/UHCourse";
import { CourseDetail } from "../components/CourseDetail";
import { FullscreenViewer } from "../components/FullscreenViewer";
import { PathwayConfirmModal } from "../components/PathwayConfirmModal";
import { PathwayPreview } from "../components/PathwayPreview";
import { PathwayResultCard } from "../components/PathwayResultCard";
import { ThemeToggle } from "../components/ThemeToggle";
import { useExportPathwayPdf } from "../hooks/useExportPathwayPdf";
import { usePredictDegreePathway } from "../hooks/usePredictDegreePathway";
import { usePredictDegreePathwayById } from "../hooks/usePredictDegreePathwayById";
import { usePathwaySimilarSearch } from "../hooks/usePathwaySimilarSearch";
import { usePathwayTextSearch } from "../hooks/usePathwayTextSearch";
import {
  PENDING_MESSAGES,
  THEME_STORAGE_KEY,
  applyCourseOverrides,
  formatFileSize,
  getFileKey,
  getOverridesStorageKey,
  getPlanIdentifier,
} from "@/utils/pathway";
import type {
  CourseOverrides,
  CourseSelection,
  Theme,
} from "@/utils/pathway";

export const Route = createFileRoute("/")({
  component: AppV2,
});

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

  const backgroundLayers = useMemo<
    Record<Theme, { image: string; fallbackColor: string }>
  >(
    () => ({
      dark: {
        image: "/hawaii-night.jpeg",
        fallbackColor: "#020617",
      },
      light: {
        image: "/hawaii.jpeg",
        fallbackColor: "#f8fafc",
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
          className={`absolute inset-0 overflow-hidden transition-opacity duration-[2000ms] ease-in-out ${
            theme === "dark" ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundColor: backgroundLayers.dark.fallbackColor }}
        >
          <img
            src={backgroundLayers.dark.image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full scale-102 object-cover blur-sm brightness-110 transform-gpu"
          />
        </div>
        <div
          className={`absolute inset-0 overflow-hidden transition-opacity duration-[2000ms] ease-in-out ${
            theme === "light" ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundColor: backgroundLayers.light.fallbackColor }}
        >
          <img
            src={backgroundLayers.light.image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-full w-full scale-102 object-cover blur-sm brightness-[1.05] transform-gpu"
          />
        </div>
      </div>
      {isPredicting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-slate-800 bg-slate-950/80 px-8 py-10 shadow-2xl min-h-[18rem]">
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
