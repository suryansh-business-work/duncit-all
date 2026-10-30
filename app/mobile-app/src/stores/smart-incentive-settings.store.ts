import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import { SmartIncentiveSettingsDocument } from '@/graphql/config';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type SmartIncentiveSettingsData = ResultOf<typeof SmartIncentiveSettingsDocument>;

/**
 * Loyalty > Smart Incentive's settings, cached app-wide and read through
 * `useSmartIncentiveSettings` by the host's editors and the forms that check
 * them. A failed read is logged here once and retried by the next screen that
 * asks.
 */
export const useSmartIncentiveSettingsStore = createQueryStore<SmartIncentiveSettingsData>(() =>
  graphqlRequest(SmartIncentiveSettingsDocument, undefined, { auth: true }).catch(
    (error: unknown) => {
      logs.mobileApp.warn('smartIncentive', 'settings', { error });
      throw error;
    },
  ),
);
