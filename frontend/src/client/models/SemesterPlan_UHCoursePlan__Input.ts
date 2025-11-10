/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UHCoursePlan_Input } from './UHCoursePlan_Input';
export type SemesterPlan_UHCoursePlan__Input = {
    semester_name: SemesterPlan_UHCoursePlan__Input.semester_name;
    credits: number;
    courses: Array<UHCoursePlan_Input>;
};
export namespace SemesterPlan_UHCoursePlan__Input {
    export enum semester_name {
        FALL = 'fall',
        SPRING = 'spring',
        SUMMER = 'summer',
    }
}

