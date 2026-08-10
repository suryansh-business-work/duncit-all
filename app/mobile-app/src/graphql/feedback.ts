import gql from 'graphql-tag';
import { REPORT_PROBLEM_CONFIG_SDL, SUBMIT_APP_FEEDBACK_SDL } from '@duncit/slack';

/** Authed in-app feedback mutation. The operation source is single-sourced from
 * @duncit/slack (shared with mWeb + the server contract). */
export const SubmitAppFeedbackDocument = gql(SUBMIT_APP_FEEDBACK_SDL);

/** The admin-configured Report a Problem form. Source shared with mWeb through
 * @duncit/slack so the two surfaces render the same thing (rule 27). */
export const ReportProblemConfigDocument = gql(REPORT_PROBLEM_CONFIG_SDL);
