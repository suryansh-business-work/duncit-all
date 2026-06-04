import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ProfileDocument } from '@/graphql/profile';
import { graphqlRequest } from '@/services/graphql.client';

export type ProfileData = ResultOf<typeof ProfileDocument>;
export type ProfileMe = NonNullable<ProfileData['me']>;
export type ProfilePost = ProfileData['myPosts'][number];

/** Fetches the signed-in user's profile + posts (auth). */
export function useProfile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    graphqlRequest(ProfileDocument, undefined, { auth: true })
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { me: data?.me ?? null, posts: data?.myPosts ?? [], isLoading, error };
}
