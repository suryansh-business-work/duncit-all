import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobilePublicProfileDocument, MobileUserBadgesDocument } from '@/graphql/public-profile';
import { graphqlRequest } from '@/services/graphql.client';

type ProfileData = ResultOf<typeof MobilePublicProfileDocument>;
export type PublicProfileUser = NonNullable<ProfileData['publicUserProfile']>;
export type UserBadge = ResultOf<typeof MobileUserBadgesDocument>['userBadges'][number];

/** A user's public profile + badges + whether the viewer owns it — RN port of
 * mWeb's PublicProfilePage data layer. */
export function usePublicProfile(userId: string) {
  const [user, setUser] = useState<PublicProfileUser | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    Promise.all([
      graphqlRequest(MobilePublicProfileDocument, { user_id: userId }, { auth: true }).then((d) => {
        if (!active) return;
        setUser(d.publicUserProfile ?? null);
        setIsOwner(!!d.me?.user_id && d.me.user_id === d.publicUserProfile?.user_id);
      }),
      graphqlRequest(MobileUserBadgesDocument, { user_id: userId }, { auth: true })
        .then((d) => active && setBadges(d.userBadges))
        .catch(() => undefined),
    ])
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  return { user, isOwner, badges, isLoading, error };
}
