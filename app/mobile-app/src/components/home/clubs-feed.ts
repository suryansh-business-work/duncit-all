import {
  groupClubsByCity,
  groupClubsByLocality,
  type ClubCityGroup,
  type ClubCityLocation,
} from '@duncit/utils';

import { interleaveAds } from '@/components/ads/interleaveAds';
import type { ActiveAd } from '@/hooks/useActiveAds';
import type { HomeClub } from '@/hooks/useHomeFeed';

/** One row of the Clubs tab list: a city card, a locality heading, a club or an ad. */
export type ClubsFeedEntry =
  | { kind: 'city'; key: string; group: ClubCityGroup<HomeClub> }
  | { kind: 'locality'; key: string; title: string }
  | { kind: 'club'; key: string; club: HomeClub }
  | { kind: 'ad'; key: string; ad: ActiveAd };

/** A sponsored banner every 4 clubs inside each locality. */
const AD_EVERY_CLUBS = 4;

/** The city cards shown before a city is chosen. mWeb twin: clubs-page/ClubCityGrid. */
export function cityCardsFeed(
  clubs: readonly HomeClub[],
  locations: readonly ClubCityLocation[],
): ClubsFeedEntry[] {
  return groupClubsByCity(clubs, locations).map((group) => ({
    kind: 'city',
    key: `city-${group.locationId}`,
    group,
  }));
}

/** One city's clubs under a heading per locality. mWeb twin: clubs-page/ClubLocalitySections. */
export function localitySectionsFeed(
  clubs: readonly HomeClub[],
  ads: readonly ActiveAd[],
  otherAreasLabel: string,
): ClubsFeedEntry[] {
  return groupClubsByLocality(clubs).flatMap(({ locality, clubs: grouped }) => {
    const rows = interleaveAds(grouped, ads, AD_EVERY_CLUBS).map<ClubsFeedEntry>((entry) =>
      entry.kind === 'ad'
        ? { ...entry, key: `${locality}-${entry.key}` }
        : { kind: 'club', key: entry.item.id, club: entry.item },
    );
    return [
      { kind: 'locality', key: `locality-${locality}`, title: locality || otherAreasLabel },
      ...rows,
    ];
  });
}
