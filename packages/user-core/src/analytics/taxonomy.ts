/**
 * The product-analytics event taxonomy every Duncit surface sends.
 *
 * Names are snake_case verbs in the past tense or `<thing>_<action>` nouns, so a
 * list of them reads as a log. The server stores any name that is snake_case,
 * which keeps a new event a client change only; this list is what the surfaces
 * emit today and what the Analytics console offers when building a funnel.
 */
export const PRODUCT_EVENTS = {
  /** The app was launched (native cold start, or an mWeb tab loading). */
  appOpen: 'app_open',
  /** The app came back to the front. */
  appForeground: 'app_foreground',
  /** The app left the front; carries the time spent on the screen on top. */
  appBackground: 'app_background',
  /** A screen opened; carries the screen before it and the time spent there. */
  screenView: 'screen_view',
  /** A control was pressed: a button, a link, a tab. */
  elementClick: 'element_click',
  /** An element marked for it scrolled into view. */
  elementImpression: 'element_impression',
  /** A search was run; carries the redacted query and how many results it found. */
  searchPerformed: 'search_performed',
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

/** Where the app is running: the native app on iOS or Android, its web build, or mWeb. */
export type ProductPlatform = 'ios' | 'android' | 'web' | 'mweb';

/** A session ends after this long without any activity — the industry default, so numbers compare. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** What the server stores per event (its `AppEventInput`). */
export interface ProductEventPayload {
  event_name: string;
  client_event_id: string;
  session_id: string;
  occurred_at: string;
  platform: ProductPlatform;
  app_version: string;
  os_version: string;
  device_type: string;
  screen_name: string;
  previous_screen: string;
  path: string;
  title: string;
  element_id: string;
  element_type: string;
  element_name: string;
  element_text: string;
  target_href: string;
  duration_ms: number | null;
  super_category_slug: string | null;
  pod_id: string | null;
  properties_json: string;
}

/** Plain values only: an event property is never an object, a list or a person's text. */
export type ProductProperties = Readonly<Record<string, string | number | boolean | null>>;

/** Phone under 768 px wide, tablet under 1024 px, desktop beyond — for surfaces that only know a width. */
export function deviceTypeForWidth(width: number): 'phone' | 'tablet' | 'desktop' {
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
