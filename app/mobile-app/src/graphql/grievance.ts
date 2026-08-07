import gql from 'graphql-tag';
import { GRIEVANCE_OFFICER_SDL, SUBMIT_GRIEVANCE_SDL } from '@duncit/utils';

/**
 * The grievance operations. Their source is single-sourced from @duncit/utils
 * so mWeb, this app and the website all send exactly the same documents.
 */
export const SubmitGrievanceDocument = gql(SUBMIT_GRIEVANCE_SDL);
export const GrievanceOfficerDocument = gql(GRIEVANCE_OFFICER_SDL);
