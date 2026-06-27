import type { ResultOf } from '@graphql-typed-document-node/core';

import { PublicFeatureFlagsDocument } from '@/graphql/config';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type FeatureFlagsData = ResultOf<typeof PublicFeatureFlagsDocument>;

/** Server-seeded public feature flags, cached app-wide (mirrors mWeb). */
export const useFeatureFlagsStore = createQueryStore<FeatureFlagsData>(() =>
  graphqlRequest(PublicFeatureFlagsDocument),
);
