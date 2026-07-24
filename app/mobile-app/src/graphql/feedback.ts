import gql from 'graphql-tag';
import { SUBMIT_APP_FEEDBACK_SDL } from '@duncit/slack';

/** Authed in-app feedback mutation. The operation source is single-sourced from
 * @duncit/slack (shared with mWeb + the server contract). */
export const SubmitAppFeedbackDocument = gql(SUBMIT_APP_FEEDBACK_SDL);
