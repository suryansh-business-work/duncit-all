import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileMeDocument } from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { endRejectedSession } from '@/services/session-guard';
import { createQueryStore } from './create-query-store';

export type MeData = ResultOf<typeof MobileMeDocument>;

/**
 * The signed-in user (name, email, photo, roles) for the account drawer.
 *
 * A null `me` is not an empty result, it is a REFUSED one: this query is only
 * ever asked with a token attached, and a transport failure throws rather than
 * answering null. So the answer is signed out — because the account was deleted,
 * blocked, or sealed by a deletion request filed on another device — and the
 * phone acts on it instead of rendering a signed-in shell over it. The twin of
 * mWeb's `loadUser` guard in `main.tsx` (rule 27).
 */
export const useMeStore = createQueryStore<MeData>(async () => {
  const data = await graphqlRequest(MobileMeDocument, undefined, { auth: true });
  if (!data?.me) endRejectedSession();
  return data;
});

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
