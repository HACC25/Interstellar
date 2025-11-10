/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_predict_degree_pathway_predict_post } from '../models/Body_predict_degree_pathway_predict_post';
import type { CompleteDegreePathway_Input } from '../models/CompleteDegreePathway_Input';
import type { CompleteDegreePathway_Output } from '../models/CompleteDegreePathway_Output';
import type { DegreePathwayBase_PathwayCourse_ } from '../models/DegreePathwayBase_PathwayCourse_';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Predict Degree Pathway
     * @param formData
     * @returns CompleteDegreePathway_Output Successful Response
     * @throws ApiError
     */
    public static predictDegreePathwayPredictPost(
        formData: Body_predict_degree_pathway_predict_post,
    ): CancelablePromise<CompleteDegreePathway_Output> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/predict',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Predict Degree Pathway By Id
     * @param pathwayId
     * @param requestBody
     * @returns CompleteDegreePathway_Output Successful Response
     * @throws ApiError
     */
    public static predictDegreePathwayByIdPredictPathwayIdPost(
        pathwayId: string,
        requestBody: string,
    ): CancelablePromise<CompleteDegreePathway_Output> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/predict/{pathway_id}',
            path: {
                'pathway_id': pathwayId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Pathway Text Search
     * @param query
     * @param limit
     * @returns DegreePathwayBase_PathwayCourse_ Successful Response
     * @throws ApiError
     */
    public static pathwayTextSearchPathwaysTextSearchGet(
        query: string,
        limit: number = 8,
    ): CancelablePromise<Array<DegreePathwayBase_PathwayCourse_>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/pathways/text-search',
            query: {
                'query': query,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Pathway Similarity Search
     * @param query
     * @param limit
     * @returns DegreePathwayBase_PathwayCourse_ Successful Response
     * @throws ApiError
     */
    public static pathwaySimilaritySearchPathwaysSimilarGet(
        query: string,
        limit: number = 8,
    ): CancelablePromise<Array<DegreePathwayBase_PathwayCourse_>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/pathways/similar',
            query: {
                'query': query,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Pathway By Id
     * @param pathwayId
     * @returns DegreePathwayBase_PathwayCourse_ Successful Response
     * @throws ApiError
     */
    public static getPathwayByIdPathwaysPathwayIdGet(
        pathwayId: string,
    ): CancelablePromise<DegreePathwayBase_PathwayCourse_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/pathways/{pathway_id}',
            path: {
                'pathway_id': pathwayId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Export Pathway Pdf
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportPathwayPdfExportPost(
        requestBody: CompleteDegreePathway_Input,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/export',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
