/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreditsRange } from './CreditsRange';
export type UHCourse = {
    course_id?: string;
    course_prefix: string;
    course_number: number;
    course_suffix?: (string | null);
    course_title: string;
    course_desc: string;
    num_units: CreditsRange;
    dept_name: string;
    inst_ipeds: number;
    metadata: string;
    designations: Array<string>;
};

