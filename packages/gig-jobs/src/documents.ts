import { gql, type TypedDocumentNode } from '@apollo/client';
import {
  CREATE_GIG_JOB_MUTATION,
  EXPRESS_GIG_INTEREST_MUTATION,
  GIG_CATEGORIES_QUERY,
  GIG_JOBS_QUERY,
  GIG_JOB_INTERESTS_QUERY,
  GIG_JOB_QUERY,
  GIG_VIEWER_QUERY,
  MY_FREELANCER_PROFILE_QUERY,
  MY_GIG_JOBS_QUERY,
  SAVE_FREELANCER_PROFILE_MUTATION,
  SET_GIG_JOB_STATUS_MUTATION,
  UPDATE_GIG_JOB_MUTATION,
  type FreelancerProfile,
  type GigCategory,
  type GigInterest,
  type GigJob,
  type GigJobFilter,
  type GigJobPage,
  type GigJobStatus,
  type GigViewer,
  type toFreelancerInput,
  type toGigJobInput,
} from '@duncit/utils';

/**
 * Gig Jobs' documents, parsed once for Apollo. The text is @duncit/utils' —
 * the same strings the native app sends.
 */

type GigJobInput = ReturnType<typeof toGigJobInput>;
type FreelancerInput = ReturnType<typeof toFreelancerInput>;
interface PageVars {
  offset?: number;
  limit?: number;
}

export const GIG_CATEGORIES: TypedDocumentNode<{ gigCategories: GigCategory[] }> = gql(GIG_CATEGORIES_QUERY);

export const GIG_VIEWER: TypedDocumentNode<{ gigViewer: GigViewer }> = gql(GIG_VIEWER_QUERY);

export const GIG_JOBS: TypedDocumentNode<{ gigJobs: GigJobPage }, PageVars & { filter?: GigJobFilter }> =
  gql(GIG_JOBS_QUERY);

export const MY_GIG_JOBS: TypedDocumentNode<{ myGigJobs: GigJobPage }, PageVars> = gql(MY_GIG_JOBS_QUERY);

export const GIG_JOB: TypedDocumentNode<{ gigJob: GigJob | null }, { id: string }> = gql(GIG_JOB_QUERY);

export const GIG_JOB_INTERESTS: TypedDocumentNode<{ gigJobInterests: GigInterest[] }, { job_id: string }> =
  gql(GIG_JOB_INTERESTS_QUERY);

export const MY_FREELANCER_PROFILE: TypedDocumentNode<{ myFreelancerProfile: FreelancerProfile | null }> =
  gql(MY_FREELANCER_PROFILE_QUERY);

export const CREATE_GIG_JOB: TypedDocumentNode<{ createGigJob: GigJob }, { input: GigJobInput }> =
  gql(CREATE_GIG_JOB_MUTATION);

export const UPDATE_GIG_JOB: TypedDocumentNode<{ updateGigJob: GigJob }, { id: string; input: GigJobInput }> =
  gql(UPDATE_GIG_JOB_MUTATION);

export const SET_GIG_JOB_STATUS: TypedDocumentNode<{ setGigJobStatus: GigJob }, { id: string; status: GigJobStatus }> =
  gql(SET_GIG_JOB_STATUS_MUTATION);

export const EXPRESS_GIG_INTEREST: TypedDocumentNode<{ expressGigInterest: GigJob }, { job_id: string; message?: string }> =
  gql(EXPRESS_GIG_INTEREST_MUTATION);

export const SAVE_FREELANCER_PROFILE: TypedDocumentNode<
  { saveFreelancerProfile: FreelancerProfile },
  { input: FreelancerInput }
> = gql(SAVE_FREELANCER_PROFILE_MUTATION);
