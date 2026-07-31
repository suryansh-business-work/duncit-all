import { gql } from '@apollo/client';
import { captureShortLinkAttribution, storedShortLinkClickId } from '@duncit/utils';
import { apolloClient } from '../apollo';
import { urlConfigs } from '../config/url-configs';

/**
 * Short-link journey reporting for mWeb.
 *
 * The landing itself is captured by the shared `@duncit/utils` helper, which
 * reports to the API's `/r/v` endpoint — that call verifies the URL markers
 * (`dlc` click id, or the `dl` code alone when the redirect was skipped)
 * against the database and stamps LANDED server-side. What remains here is
 * the funnel: the steps only this app can see, reported over GraphQL because
 * the authenticated call is what binds the click to the account.
 */
export const JOURNEY_STEPS = ['SIGNED_UP', 'SURVEY_DONE', 'VIEWED_POD', 'CHECKOUT_STARTED'] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number];

const RECORD_STEP = gql`
  mutation RecordShortLinkJourney($click_id: String!, $step: ShortLinkJourneyStep!) {
    recordShortLinkJourney(click_id: $click_id, step: $step)
  }
`;

/** The click this browser is attributed to, from an earlier landing. */
export const storedClickId = storedShortLinkClickId;

/**
 * Capture the landing. Runs at module scope in main.tsx BEFORE React mounts,
 * because `RequireAuth` rewrites the URL to /login?redirect=… for signed-out
 * visitors and mounting waits up to 3s on config — by then the markers are
 * gone from location.search. Resolution-only promise; nothing awaits it.
 */
export function captureShortLinkClick(search: string): Promise<string | null> {
  return captureShortLinkAttribution({
    search,
    referrer: globalThis.document?.referrer ?? '',
    serverUrl: urlConfigs.apiBaseUrl,
  });
}

/**
 * Report that the visitor reached a step. Fire-and-forget: attribution is
 * never worth delaying or breaking a screen over, and the server ignores a
 * step it has already recorded.
 */
export function reportJourneyStep(step: JourneyStep): void {
  const clickId = storedClickId();
  if (!clickId) return;
  apolloClient
    .mutate({ mutation: RECORD_STEP, variables: { click_id: clickId, step } })
    .catch(() => undefined);
}
