import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileUserInfoDocument } from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { endRejectedSession } from '@/services/session-guard';
import { errorCode } from '@/utils/errors';
import { useCoinBalanceStore } from './coin.store';
import { usePublicPoliciesStore } from './policies.store';
import { createQueryStore } from './create-query-store';

export type MeData = Pick<ResultOf<typeof MobileUserInfoDocument>, 'me'>;

/**
 * The signed-in user — loaded through the ONE user-info request, which also
 * carries the coin balance and the drawer's policy links. Those two are handed
 * to their own stores here, so the sidebar card, the checkout and the policies
 * list all start from this answer instead of each asking again.
 *
 * A refused session ends here. A null `me` is not an empty result, it is a
 * REFUSED one: this query is only ever asked with a token attached, and a
 * transport failure throws rather than answering null. The balance beside it
 * answers UNAUTHENTICATED for the same refusal, and being non-null it takes the
 * whole payload with it — so that code means signed out too. Either way the
 * phone acts on it instead of rendering a signed-in shell over it. The twin of
 * mWeb's `loadUserInfo` (rule 27).
 */
export const useMeStore = createQueryStore<MeData>(async () => {
  try {
    const { me, myCoinBalance, publicPolicies } = await graphqlRequest(
      MobileUserInfoDocument,
      undefined,
      { auth: true },
    );
    if (!me) {
      endRejectedSession();
      return { me: null };
    }
    useCoinBalanceStore.setState({ data: { myCoinBalance }, error: undefined });
    usePublicPoliciesStore.setState({ data: { publicPolicies }, error: undefined });
    return { me };
  } catch (error) {
    if (errorCode(error) !== 'UNAUTHENTICATED') throw error;
    endRejectedSession();
    return { me: null };
  }
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
