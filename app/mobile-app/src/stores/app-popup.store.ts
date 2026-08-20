import { Platform } from 'react-native';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  detectClientPlatform,
  type AppPopupClientPlatform as ClientPlatformKind,
} from '@duncit/utils';

import { ActiveAppPopupDocument } from '@/graphql/app-popup';
import { AppPopupClientPlatform } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type ActiveAppPopupData = ResultOf<typeof ActiveAppPopupDocument>;

/** The codegen enum for each platform this app can report. A map, not a chain
 * of ternaries. */
const CLIENT_PLATFORM: Record<ClientPlatformKind, AppPopupClientPlatform> = {
  IOS: AppPopupClientPlatform.Ios,
  ANDROID: AppPopupClientPlatform.Android,
  WEB: AppPopupClientPlatform.Web,
};

/** Which store binary each native OS is. */
const KIND_BY_OS: Record<string, ClientPlatformKind> = { ios: 'IOS', android: 'ANDROID' };

/**
 * What this build reports about itself.
 *
 * A store binary reports itself. The web build is no binary at all, so it reads
 * the browser exactly as mWeb does — otherwise a campaign targeted at Android
 * would reach mWeb on a phone and miss the native web build on the same phone,
 * which is precisely the drift rule 27 exists to prevent.
 */
export const clientPlatform = (): AppPopupClientPlatform => {
  const native = KIND_BY_OS[Platform.OS];
  if (native) return CLIENT_PLATFORM[native];
  return CLIENT_PLATFORM[detectClientPlatform(globalThis.navigator?.userAgent ?? '')];
};

/**
 * The popup for this app open, fetched once per launch after sign-in.
 *
 * `auth: true` is load-bearing, not decoration: `activeAppPopup` sits behind
 * `requireAuth`, so a call without the bearer token is rejected outright and
 * the store lands in `error` with `data` still undefined — which looks exactly
 * like "no campaign is running". That is why native and native-web showed
 * nothing while mWeb, whose Apollo client attaches the token to every call,
 * showed the popup.
 *
 * Fail-safe like the version gate: while loading or on error `data` stays
 * undefined and nothing is drawn, so a server hiccup costs a popup rather than
 * putting an empty overlay in front of the app.
 */
export const useAppPopupStore = createQueryStore<ActiveAppPopupData>(() =>
  graphqlRequest(ActiveAppPopupDocument, { platform: clientPlatform() }, { auth: true }),
);
