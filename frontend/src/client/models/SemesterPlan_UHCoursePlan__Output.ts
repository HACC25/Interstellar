/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UHCoursePlan_Output } from './UHCoursePlan_Output';
export type SemesterPlan_UHCoursePlan__Output = {
    semester_name: SemesterPlan_UHCoursePlan__Output.semester_name;
    credits: number;
    courses: Array<UHCoursePlan_Output>;
};
export namespace SemesterPlan_UHCoursePlan__Output {
    export enum semester_name {
        FALL = 'fall',
        SPRING = 'spring',
        SUMMER = 'summer',
    }
}

