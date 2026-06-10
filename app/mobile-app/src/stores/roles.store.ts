import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileRolesDocument } from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type RolesData = ResultOf<typeof MobileRolesDocument>;

/** Role key → display name map source, shared with the user role chips. */
export const useRolesStore = createQueryStore<RolesData>(() => graphqlRequest(MobileRolesDocument));
