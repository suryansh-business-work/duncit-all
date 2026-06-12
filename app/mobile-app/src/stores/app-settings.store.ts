import type { ResultOf } from '@graphql-typed-document-node/core';

import { PublicAppSettingsDocument } from '@/graphql/config';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type AppSettingsData = ResultOf<typeof PublicAppSettingsDocument>;

/** Admin-panel date/time display formats (Settings page), cached app-wide. */
export const useAppSettingsStore = createQueryStore<AppSettingsData>(() =>
  graphqlRequest(PublicAppSettingsDocument),
);
