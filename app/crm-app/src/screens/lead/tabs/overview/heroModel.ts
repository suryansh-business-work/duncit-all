import type { HeroModel, KindOverview, MatchedUser } from './overviewTypes';

const SHOWN_EXTRAS = 2;

function hero(
  photo: string | null | undefined,
  kindChip: string | null | undefined,
  rest: { super_category?: { name: string } | null; tags: string[]; matched?: MatchedUser | null },
  extras: readonly string[] = [],
): HeroModel {
  return {
    photo: photo || null,
    kindChip: kindChip || null,
    superCategory: rest.super_category?.name || null,
    matched: rest.matched ?? null,
    extras: extras.slice(0, SHOWN_EXTRAS),
    more: Math.max(extras.length - SHOWN_EXTRAS, 0),
    tags: rest.tags,
  };
}

/**
 * The chips each kind's hero shows after status and priority, as the portal
 * draws them: a venue's first two types, a host's type and first two
 * interests, an ecomm brand, a creator's platform, a community's type.
 */
export function heroModel(overview: KindOverview): HeroModel {
  switch (overview.kind) {
    case 'VENUE_LEAD': {
      const { data } = overview;
      return hero(data.logo_url, null, { ...data, matched: data.matched_user }, data.venue_types);
    }
    case 'HOST_LEAD': {
      const { data } = overview;
      return hero(
        data.profile_photo_url,
        data.host_type,
        { ...data, matched: data.matched_user },
        data.interests,
      );
    }
    case 'ECOMM_LEAD': {
      const { data } = overview;
      return hero(data.profile_photo_url, data.brand_name, { ...data, matched: data.matched_user });
    }
    case 'CREATOR_LEAD':
      return hero(overview.data.profile_photo_url, overview.data.primary_platform, overview.data);
    default:
      return hero(overview.data.profile_photo_url, overview.data.community_type, overview.data);
  }
}
