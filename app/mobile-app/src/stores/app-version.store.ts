import type { ResultOf } from '@graphql-typed-document-node/core';

import { AppVersionInfoDocument } from '@/graphql/config';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type AppVersionInfoData = ResultOf<typeof AppVersionInfoDocument>;

/**
 * Public app-version info, fetched once at boot (PUBLIC — no auth). Fail-safe:
 * while loading or on error `data` stays undefined, so the force-update gate
 * reads an empty `latest_version` and does NOT block — a server hiccup must
 * never lock everyone out.
 */
export const useAppVersionStore = createQueryStore<AppVersionInfoData>(() =>
  graphqlRequest(AppVersionInfoDocument),
);
