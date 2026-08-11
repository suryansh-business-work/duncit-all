import { Platform } from 'react-native';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ActiveAppPopupDocument } from '@/graphql/app-popup';
import { AppPopupClientPlatform } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type ActiveAppPopupData = ResultOf<typeof ActiveAppPopupDocument>;

/** What this build reports about itself. A map, not a chain of ternaries, and
 * the web build (Expo web) reports WEB — it is neither store binary. */
const PLATFORM_BY_OS: Record<string, AppPopupClientPlatform> = {
  ios: AppPopupClientPlatform.Ios,
  android: AppPopupClientPlatform.Android,
};

export const clientPlatform = () => PLATFORM_BY_OS[Platform.OS] ?? AppPopupClientPlatform.Web;

/**
 * The popup for this app open, fetched once per launch after sign-in.
 *
 * Fail-safe like the version gate: while loading or on error `data` stays
 * undefined and nothing is drawn, so a server hiccup costs a popup rather than
 * putting an empty overlay in front of the app.
 */
export const useAppPopupStore = createQueryStore<ActiveAppPopupData>(() =>
  graphqlRequest(ActiveAppPopupDocument, { platform: clientPlatform() }),
);
