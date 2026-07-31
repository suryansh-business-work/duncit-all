import { gql } from '@apollo/client';
import { apolloClient } from '../apollo';

/**
 * Short-link attribution.
 *
 * A duncit.com link redirects here carrying `dlc` — the id of the click that
 * sent the visitor. Holding on to it lets the marketing console follow one
 * click all the way to a payment.
 *
 * FIRST TOUCH WINS. A visitor who arrives from an Instagram link, wanders off
 * and comes back through a WhatsApp one keeps the first attribution for the
 * rest of that stored journey — otherwise the last link before checkout would
 * take credit for work the first one did.
 */
const KEY = 'duncit_short_link_click';

export const JOURNEY_STEPS = [
  'LANDED',
  'SIGNED_UP',
  'SURVEY_DONE',
  'VIEWED_POD',
  'CHECKOUT_STARTED',
] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number];

const RECORD_STEP = gql`
  mutation RecordShortLinkJourney($click_id: String!, $step: ShortLinkJourneyStep!) {
    recordShortLinkJourney(click_id: $click_id, step: $step)
  }
`;

/** The click id a search string carries, if it carries one. */
export function clickIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get('dlc');
}

export function storedClickId(): string | null {
  try {
    return globalThis.localStorage.getItem(KEY);
  } catch {
    // Private mode / storage disabled: attribution is simply unavailable.
    return null;
  }
}

/**
 * Remember the click that brought this visitor, if it is the first one we have
 * seen. Runs at module scope before React mounts, because `RequireAuth`
 * rewrites the URL to /login?redirect=… for signed-out visitors and mounting
 * is delayed by up to 3s waiting on config — by then the parameter is gone.
 */
export function captureShortLinkClick(search: string): string | null {
  const incoming = clickIdFromSearch(search);
  if (!incoming) return storedClickId();
  const existing = storedClickId();
  if (existing) return existing;
  try {
    globalThis.localStorage.setItem(KEY, incoming);
  } catch {
    // Nothing to do — the step below still reports against this page load.
  }
  return incoming;
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
