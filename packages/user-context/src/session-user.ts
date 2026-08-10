import { gql, type ApolloClient, type DocumentNode } from '@apollo/client';
import { ME_FIELDS } from '@duncit/user-core';
import type { DuncitUser } from './types';

/**
 * The `me` bootstrap every portal previously re-declared in its `main.tsx`
 * (the `SessionMe` query + a network-only `loadUser` passed to `mountPortal`).
 */
export interface SessionUserLoaderOptions {
  /** GraphQL operation name. Default `'SessionMe'` (partners-app: `'PartnerSessionMe'`). */
  operationName?: string;
  /** Extra fields selected on `me` in addition to the standard session fields. */
  extraFields?: readonly string[];
  /** Full query override (e.g. admin's richer `ADMIN_ME`); wins over the built query. */
  query?: DocumentNode;
}

export function buildSessionMeQuery(
  operationName = 'SessionMe',
  extraFields: readonly string[] = [],
): DocumentNode {
  // The selection itself lives in @duncit/user-core so mWeb, the native app and
  // the 17 portals read the same account. This query used to name eight fields;
  // `timezone`, the verification flags and the assigned city/zones the shell
  // gates on were simply absent, so a portal could not tell them from unset.
  const extra = extraFields.length ? `\n      ${extraFields.join('\n      ')}` : '';
  return gql(`
  query ${operationName} {
    me {${ME_FIELDS}${extra}
    }
  }
`);
}

/**
 * Returns the `loadUser` function `mountPortal` / `UserProvider` expect:
 * a network-only fetch of `me` resolving to the user or `null`.
 */
export function createSessionUserLoader<TCacheShape>(
  client: ApolloClient<TCacheShape>,
  options: SessionUserLoaderOptions = {},
): () => Promise<DuncitUser | null> {
  const query = options.query ?? buildSessionMeQuery(options.operationName, options.extraFields);
  return async () => {
    const { data } = await client.query<{ me?: DuncitUser | null }>({
      query,
      fetchPolicy: 'network-only',
    });
    return data?.me ?? null;
  };
}
