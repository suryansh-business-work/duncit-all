import {
  createProductTracker,
  deviceTypeForWidth,
  type ProductEventPayload,
  type ProductTracker,
} from '@duncit/user-core';
import { consentAllows, readWebConsent } from '@duncit/utils';

/**
 * mWeb's one product-analytics tracker (the shared `@duncit/user-core` one,
 * twin of the native app's `services/product-analytics.ts`). One per tab, so
 * the session and the screen sequence survive every route change.
 * `useClickstreamTracking` connects it to Apollo; any page may then report a
 * taxonomy event through `trackProductEvent` (the search page does).
 */

type Send = (events: ProductEventPayload[]) => Promise<unknown>;

let send: Send | null = null;
let tracker: ProductTracker | null = null;

export function productTracker(): ProductTracker {
  tracker ??= createProductTracker({
    platform: 'mweb',
    appVersion: __APP_VERSION__,
    deviceType: deviceTypeForWidth(globalThis.window.innerWidth),
    // Read at every event: the moment the visitor answers the banner, it applies.
    allowed: () => consentAllows(readWebConsent(), 'analytics'),
    // Rejected until connected, so the queue keeps the events for the next flush.
    send: (events) => (send ? send(events) : Promise.reject(new Error('Product analytics is not connected yet'))),
  });
  return tracker;
}

/** Hands the tracker its transport — the Apollo mutation. */
export function connectProductAnalytics(next: Send): void {
  send = next;
}

/** Any taxonomy event beside screens and clicks, e.g. `search_performed`. */
export function trackProductEvent(...args: Parameters<ProductTracker['track']>): void {
  productTracker().track(...args);
}
