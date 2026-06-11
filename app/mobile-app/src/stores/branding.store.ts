import type { ResultOf } from '@graphql-typed-document-node/core';

import { BrandingDocument } from '@/graphql/branding';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type BrandingData = ResultOf<typeof BrandingDocument>;

/** Shared brand (app name + logo + mascot) from the server `branding` setting. */
export const useBrandingStore = createQueryStore<BrandingData>(() =>
  graphqlRequest(BrandingDocument),
);
