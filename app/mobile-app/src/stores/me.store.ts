import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileMeDocument } from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { createQueryStore } from './create-query-store';

export type MeData = ResultOf<typeof MobileMeDocument>;

/** The signed-in user (name, email, photo, roles) for the account drawer. */
export const useMeStore = createQueryStore<MeData>(() =>
  graphqlRequest(MobileMeDocument, undefined, { auth: true }),
);

/**
 * Merge a partial account change into the cached user.
 *
 * Called by `useSession()` when a `user:changed` frame arrives, so a profile
 * edit made on the web shows here without a refetch. The frame is already
 * filtered to the fields the server allows to move, and speaks the server's
 * field names, so it merges straight in.
 *
 * A no-op when nothing is loaded yet: the next `fetch` brings the change
 * anyway, and inventing a `me` from a patch would produce a user with no id.
 */
export function patchMe(patch: Record<string, unknown>): void {
  const current = useMeStore.getState().data?.me;
  if (!current) return;
  useMeStore.setState({ data: { me: { ...current, ...patch } } });
}
