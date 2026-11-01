import { AppState, Dimensions, Platform } from 'react-native';
import {
  createProductTracker,
  deviceTypeForWidth,
  type ElementRef,
  type ProductPlatform,
  type ProductTracker,
} from '@duncit/user-core';
import { consentAllows } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { RecordAppEventsDocument } from '@/graphql/product-analytics';
import { navigationRef } from '@/navigation/navigationRef';
import { graphqlRequest } from '@/services/graphql.client';
import { useConsentStore } from '@/stores/consent.store';
import { appVersion } from '@/utils/app-version';

/**
 * Product analytics on the native app: the shared `@duncit/user-core` tracker,
 * fed by React Navigation (every screen, by route name), AppState (launch,
 * background, foreground) and the app's shared buttons. Batches go to
 * `recordAppEvents` with the same headers as every request — the device id,
 * and the consent the server checks again.
 */

const PLATFORM: ProductPlatform =
  Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';

/** Phone or tablet by the shorter side, as the device is held either way; the web build goes by width. */
function deviceType(): string {
  const { width, height } = Dimensions.get('window');
  if (PLATFORM === 'web') return deviceTypeForWidth(width);
  if (Platform.OS === 'ios' && Platform.isPad) return 'tablet';
  return Math.min(width, height) >= 600 ? 'tablet' : 'phone';
}

let tracker: ProductTracker | null = null;

function productTracker(): ProductTracker {
  tracker ??= createProductTracker({
    platform: PLATFORM,
    appVersion: appVersion(),
    osVersion: String(Platform.Version),
    deviceType: deviceType(),
    allowed: () => consentAllows(useConsentStore.getState().choice, 'analytics'),
    send: (events) =>
      graphqlRequest(RecordAppEventsDocument, { events }, { auth: true }).catch(
        (error: unknown) => {
          logs.mobileApp.warn('product-analytics', 'send', { error, events: events.length });
          // Rethrown so the queue keeps the batch for the next flush.
          throw error;
        },
      ),
  });
  return tracker;
}

/** The screen on top now, by its route name — called when navigation is ready and on every change. */
export function trackCurrentScreen(): void {
  const name = navigationRef.getCurrentRoute?.()?.name;
  if (name) productTracker().screen(name);
}

/** A press on one of the app's shared controls. */
export function trackPress(element: ElementRef): void {
  productTracker().click(element);
}

/** Any other taxonomy event, e.g. `search_performed`. */
export function trackProductEvent(...args: Parameters<ProductTracker['track']>): void {
  productTracker().track(...args);
}

/**
 * Root wiring: `app_open` once the stored consent has been read (an event sent
 * before it would be dropped as unconsented), then background / foreground as
 * the app comes and goes. Returns the unsubscribe.
 */
export function startProductAnalytics(): () => void {
  const active = productTracker();
  useConsentStore
    .getState()
    .hydrate()
    .then(() => active.open())
    .catch((error: unknown) => logs.mobileApp.warn('product-analytics', 'open', { error }));
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') active.foreground();
    else if (state === 'background') active.background();
  });
  return () => {
    subscription.remove();
    active.stop();
  };
}
