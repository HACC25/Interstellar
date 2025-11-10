/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DegreePathwayCandidate } from './DegreePathwayCandidate';
import type { YearPlan_UHCoursePlan__Output } from './YearPlan_UHCoursePlan__Output';
export type CompleteDegreePathway_Output = {
    pathway_id?: string;
    program_name: string;
    institution: string;
    total_credits: number;
    years: Array<YearPlan_UHCoursePlan__Output>;
    summary: string;
    candidates: Array<DegreePathwayCandidate>;
};

