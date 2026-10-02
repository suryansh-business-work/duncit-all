import * as Linking from 'expo-linking';
import { parse } from 'graphql';
import { consentAllows, SHORT_LINK_CONSENT_PARAM } from '@duncit/utils';
import { getItem, setItem } from './secure-storage';
import { graphqlRequest } from './graphql.client';
import { getAuthToken } from './auth-token';
import { SHORT_LINK_CLICK_KEY } from './short-link-click-key';
import { config } from '../constants/config';
import { navigationRef } from '../navigation/navigationRef';
import { useConsentStore } from '../stores/consent.store';

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
 *
 * Keeping the click is attribution, so it happens only with marketing consent
 * (@duncit/utils consent.ts). Without it the landing is still reported — the
 * server counts it anonymously — but nothing is read or written on the device.
 */
export { SHORT_LINK_CLICK_KEY };

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

const marketingAllowed = (): boolean =>
  consentAllows(useConsentStore.getState().choice, 'marketing');

/**
 * A click resolved while marketing consent was not given. Held in memory only,
 * so a yes given later in the same session can still keep it — the device
 * never wrote it anywhere. First touch wins here too.
 */
let pendingClickId: string | null = null;

/** The /r/v query a landing URL reports, or null when it carries no marker. */
function landingParams(url: string | null): URLSearchParams | null {
  if (!url) return null;
  const { code, clickId } = shortLinkParamsFromUrl(url);
  if (!code && !clickId) return null;
  const params = new URLSearchParams();
  // The guard above proved one of the two exists; dlc is the stronger marker.
  if (clickId) params.set('dlc', clickId);
  else params.set('dl', code as string);
  return params;
}

/** Report a landing; answers the click id the server resolved it to. */
async function reportLanding(params: URLSearchParams): Promise<string | null> {
  const response = await fetch(`${config.apiUrl}/r/v?${params.toString()}`);
  const body = await response.json();
  return body?.click_id ?? null;
}

/** Without marketing consent: counted by the server, kept by nobody. */
async function captureAnonymously(params: URLSearchParams | null): Promise<string | null> {
  if (!params) return null;
  try {
    const resolved = await reportLanding(params);
    pendingClickId ??= resolved;
    return resolved;
  } catch {
    return null;
  }
}

/**
 * Report a landing URL to the API and remember which click this device
 * belongs to. FIRST TOUCH WINS, exactly as on web — the link that started the
 * journey keeps it. Never throws; attribution is not worth a crash.
 */
export async function captureFromUrl(url: string | null): Promise<string | null> {
  // The stored choice must be known before anything is read or kept.
  await useConsentStore.getState().hydrate();
  const params = landingParams(url);
  if (!marketingAllowed()) return captureAnonymously(params);
  const existing = await storedClickId();
  if (!params) return existing;
  // Tells the server it may bind the click to this visit, not just count it.
  params.set(SHORT_LINK_CONSENT_PARAM, '1');

  try {
    const resolved = await reportLanding(params);
    if (existing) return existing;
    if (resolved) await setItem(SHORT_LINK_CLICK_KEY, resolved);
    return resolved;
  } catch {
    return existing;
  }
}

/**
 * The landing capture, in flight.
 *
 * Steps wait on this rather than reading the store directly. The app link that
 * opens the app and the session it already holds arrive on the same tick, so a
 * step read from storage right then — and being signed in is the very first
 * one — found nothing and dropped the account binding. A payment is matched to
 * a click through that binding, which is why a purchase made in the app after
 * following a link was never credited to it.
 */
let capture: Promise<string | null> = storedClickId();

/**
 * Report that the visitor reached a step. Fire-and-forget, authenticated when
 * a session exists — the authenticated call is what binds the click to the
 * account. The server keeps a step's first timestamp, so repeats are no-ops.
 */
export function reportJourneyStep(step: JourneyStep): void {
  capture
    .then((clickId) => {
      // A step binds the click to the account — attribution, so only with
      // marketing consent (the server refuses it without, too).
      if (!clickId || !marketingAllowed()) return null;
      return graphqlRequest<
        { recordShortLinkJourney: boolean },
        { click_id: string; step: string }
      >(RECORD_STEP, { click_id: clickId, step }, { auth: true });
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
 * Capture a landing URL and, if a session already exists, bind the click it
 * resolved to that account straight away.
 *
 * RootNavigator reports SIGNED_UP when the token CHANGES, which covers the
 * visitor who follows a link and then signs in. It cannot cover the far more
 * common case: an already-signed-in user opening a link. The token never
 * moves, so nothing there fires, and the click stayed anonymous — which is
 * exactly why their payment was never credited back to the link.
 */
function captureAndBind(url: string | null): Promise<string | null> {
  capture = captureFromUrl(url);
  capture
    .then(async (clickId) => {
      if (clickId && (await getAuthToken())) reportJourneyStep('SIGNED_UP');
    })
    .catch(() => undefined);
  return capture;
}

/**
 * Marketing consent was just given: keep the click this session landed on
 * while it was not, unless the device already holds an earlier one.
 * Answers the click the device is now attributed to.
 */
async function adoptPendingClick(): Promise<string | null> {
  const pending = pendingClickId;
  pendingClickId = null;
  const existing = await storedClickId();
  if (existing || !pending) return existing;
  await setItem(SHORT_LINK_CLICK_KEY, pending);
  return pending;
}

/**
 * Root wiring: capture the URL the app was opened with, and every URL it
 * receives while running, and keep a pending click the moment marketing
 * consent is given. Returns the unsubscribe for both listeners.
 */
export function initShortLinkAttribution(): () => void {
  // getInitialURL itself can reject; captureFromUrl cannot (every failure
  // path inside resolves), so the listener call carries no dead .catch.
  capture = Linking.getInitialURL()
    .then((url) => captureAndBind(url))
    .catch(() => null);
  const subscription = Linking.addEventListener('url', (event) => {
    captureAndBind(event.url);
  });
  const stopConsent = useConsentStore.subscribe((state, previous) => {
    const granted = consentAllows(state.choice, 'marketing');
    if (!granted || consentAllows(previous.choice, 'marketing')) return;
    capture = adoptPendingClick().catch(() => null);
  });
  return () => {
    subscription.remove();
    stopConsent();
  };
}
