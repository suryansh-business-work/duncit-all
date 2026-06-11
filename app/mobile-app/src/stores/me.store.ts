import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileMeDocument } from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type MeData = ResultOf<typeof MobileMeDocument>;

/** The signed-in user (name, email, photo, roles) for the account drawer. */
export const useMeStore = createQueryStore<MeData>(() =>
  graphqlRequest(MobileMeDocument, undefined, { auth: true }),
);
