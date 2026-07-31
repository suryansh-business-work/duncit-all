import * as Linking from 'expo-linking';
import { parse } from 'graphql';
import { getItem, setItem } from './secure-storage';
import { graphqlRequest } from './graphql.client';
import { config } from '../constants/config';
import { navigationRef } from '../navigation/navigationRef';

/**
 * Short-link attribution — the native twin of
 * packages/utils/src/short-link-attribution.ts (mWeb + websites + portals).
 * Same contract, different plumbing: secure-store instead of localStorage,
 * expo-linking URLs instead of location.search, and the navigation state
 * instead of route paths. Change one, change both.
 *
 * A duncit.com short link opens this app through an App Link carrying `dlc`
 * (the recorded click) or `dl` (the code alone, when the redirect was
 * skipped). The visit is reported to the API's /r/v — which verifies the
 * marker against the database before recording anything — and the click id is
 * kept so later funnel steps can be tied back to the exact click.
 */
export const SHORT_LINK_CLICK_KEY = 'duncit.short_link_click';

export type JourneyStep = 'SIGNED_UP' | 'SURVEY_DONE' | 'VIEWED_POD' | 'CHECKOUT_STARTED';

const RECORD_STEP = parse(`
  mutation RecordShortLinkJourney($click_id: String!, $step: ShortLinkJourneyStep!) {
    recordShortLinkJourney(click_id: $click_id, step: $step)
  }
`);

/** Which funnel step a screen represents. One list, not calls scattered
 * across screens — that is how a step quietly stops being reported. */
const ROUTE_STEPS: Record<string, JourneyStep> = {
  PodDetails: 'VIEWED_POD',
  Checkout: 'CHECKOUT_STARTED',
  ProductCheckout: 'CHECKOUT_STARTED',
};

export const stepForRouteName = (name?: string): JourneyStep | null =>
  (name && ROUTE_STEPS[name]) || null;

export interface ShortLinkParams {
  code: string | null;
  clickId: string | null;
}

/** The short-link markers a deep-link URL carries, if any. */
export function shortLinkParamsFromUrl(url: string): ShortLinkParams {
  try {
    const { queryParams } = Linking.parse(url);
    const one = (value: unknown) => (typeof value === 'string' && value ? value : null);
    return { code: one(queryParams?.dl), clickId: one(queryParams?.dlc) };
  } catch {
    return { code: null, clickId: null };
  }
}

/** The click this device is attributed to, from an earlier landing. */
export async function storedClickId(): Promise<string | null> {
  try {
    return await getItem(SHORT_LINK_CLICK_KEY);
  } catch {
    // Secure store unavailable: attribution is simply off on this device.
    return null;
  }
}

/**
 * Report a landing URL to the API and remember which click this device
 * belongs to. FIRST TOUCH WINS, exactly as on web — the link that started the
 * journey keeps it. Never throws; attribution is not worth a crash.
 */
export async function captureFromUrl(url: string | null): Promise<string | null> {
  if (!url) return storedClickId();
  const { code, clickId } = shortLinkParamsFromUrl(url);
  const existing = await storedClickId();
  if (!code && !clickId) return existing;

  const params = new URLSearchParams();
  // The guard above proved one of the two exists; dlc is the stronger marker.
  if (clickId) params.set('dlc', clickId);
  else params.set('dl', code as string);

  try {
    const response = await fetch(`${config.apiUrl}/r/v?${params.toString()}`);
    const body = await response.json();
    const resolved: string | null = body?.click_id ?? null;
    if (existing) return existing;
    if (resolved) await setItem(SHORT_LINK_CLICK_KEY, resolved);
    return resolved;
  } catch {
    return existing;
  }
}

/**
 * Report that the visitor reached a step. Fire-and-forget, authenticated when
 * a session exists — the authenticated call is what binds the click to the
 * account. The server keeps a step's first timestamp, so repeats are no-ops.
 */
export function reportJourneyStep(step: JourneyStep): void {
  storedClickId()
    .then((clickId) => {
      if (!clickId) return null;
      return graphqlRequest<{ recordShortLinkJourney: boolean }, { click_id: string; step: string }>(
        RECORD_STEP,
        { click_id: clickId, step },
        { auth: true },
      );
    })
    .catch(() => undefined);
}

/** Navigation listener: report the step of the screen just reached. Wired to
 * NavigationContainer's onStateChange in App.tsx. */
export function reportJourneyForCurrentRoute(): void {
  const step = stepForRouteName(navigationRef.getCurrentRoute?.()?.name);
  if (step) reportJourneyStep(step);
}

/**
 * Root wiring: capture the URL the app was opened with, and every URL it
 * receives while running. Returns the unsubscribe for the listener.
 */
export function initShortLinkAttribution(): () => void {
  // getInitialURL itself can reject; captureFromUrl cannot (every failure
  // path inside resolves), so the listener call carries no dead .catch.
  Linking.getInitialURL()
    .then((url) => captureFromUrl(url))
    .catch(() => undefined);
  const subscription = Linking.addEventListener('url', (event) => {
    captureFromUrl(event.url);
  });
  return () => subscription.remove();
}
