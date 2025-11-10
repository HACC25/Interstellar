/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PathwayCourse } from './PathwayCourse';
export type SemesterPlan_PathwayCourse_ = {
    semester_name: SemesterPlan_PathwayCourse_.semester_name;
    credits: number;
    courses: Array<PathwayCourse>;
};
export namespace SemesterPlan_PathwayCourse_ {
    export enum semester_name {
        FALL = 'fall',
        SPRING = 'spring',
        SUMMER = 'summer',
    }
}

