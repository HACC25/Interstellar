import type { CompleteDegreePathway_Output } from "../client/models/CompleteDegreePathway_Output";
import type { SemesterPlan_UHCoursePlan__Output } from "../client/models/SemesterPlan_UHCoursePlan__Output";
import type { UHCourse } from "../client/models/UHCourse";
import type { UHCoursePlan_Output } from "../client/models/UHCoursePlan_Output";

export type CourseSelection = {
  course: UHCoursePlan_Output | UHCourse;
  sourceCourse: UHCoursePlan_Output;
  courseKey: string;
};

export type CourseOverrides = Record<string, UHCourse>;

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "degree-pathway:theme";

export const PENDING_MESSAGES = [
  "Searching through course catalogs...",
  "Finding personalized courses...",
  "Creating your 4-year plan...",
] as const;

const OVERRIDES_STORAGE_PREFIX = "degree-pathway:course-overrides:";

export const formatSemesterName = (
  name: SemesterPlan_UHCoursePlan__Output["semester_name"]
): string => name.charAt(0).toUpperCase() + name.slice(1);

export const buildCourseKey = (
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

export const areCoursesEqual = (
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

export const applyCourseOverrides = (
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

export const getPlanIdentifier = (
  plan: CompleteDegreePathway_Output
): string => {
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

export const getOverridesStorageKey = (planIdentifier: string): string =>
  `${OVERRIDES_STORAGE_PREFIX}${encodeURIComponent(planIdentifier)}`;

export const getFileKey = (file: File): string =>
  `${file.name}-${file.size}-${file.lastModified}`;

export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }

  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }

  return `${bytes} B`;
};
