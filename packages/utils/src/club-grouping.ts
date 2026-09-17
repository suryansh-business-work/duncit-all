/**
 * The Clubs tab reads as places, not one long list: first the cities clubs
 * operate in, then — inside a city — its clubs split by locality. mWeb and the
 * native app render their own cards and section headers (rule 40: share the
 * logic, never the UI); which club lands in which group is decided here, once.
 *
 * Both helpers keep the clubs in the order they arrive, so a caller that has
 * already searched, filtered and sorted its list hands the same order down.
 */

/** The two club fields grouping reads — `location_id` is the city, `locality` an area in it. */
export interface GroupableClub {
  location_id?: string | null;
  locality?: string | null;
}

/** An admin Location row (a city), as both apps' locations queries select it. */
export interface ClubCityLocation {
  id: string;
  location_name: string;
  city?: string | null;
  location_image?: string | null;
}

export interface ClubCityGroup<T> {
  locationId: string;
  /** `city`, else the row's `location_name`. */
  city: string;
  /** The Location's cover, '' when it has none. */
  image: string;
  clubs: T[];
}

export interface ClubLocalityGroup<T> {
  /** The area's name — '' holds the clubs that name no area. */
  locality: string;
  clubs: T[];
}

const text = (value?: string | null) => (value ?? '').trim();

/** The name a city card and a locality screen's title show for a Location. */
export function clubCityName(location: ClubCityLocation): string {
  return text(location.city) || location.location_name;
}

/** 'Gomti Nagar, Lucknow' — an area and its city, or whichever of the two is known. */
export function placeLabel(locality?: string | null, city?: string | null): string {
  return [text(locality), text(city)].filter(Boolean).join(', ');
}

/**
 * Where a club operates, as the create-pod club pickers show it beside the name.
 * Two clubs can share a name, so the place is what tells them apart; a club
 * whose city is not among `locations` still shows its area.
 */
export function clubPlaceLabel(club: GroupableClub, locations: readonly ClubCityLocation[]): string {
  const location = locations.find((item) => item.id === club.location_id);
  return placeLabel(club.locality, location ? clubCityName(location) : '');
}

/** 'Who Even Are We? | Gomti Nagar, Lucknow' — the text a club picker filters and shows once picked. */
export function clubOptionLabel(clubName: string, place: string): string {
  return place ? `${clubName} | ${place}` : clubName;
}

/**
 * One group per city that has at least one of `clubs`, A→Z by city name. A club
 * whose `location_id` is not among `locations` (an inactive city) is left out:
 * a card that cannot be named cannot be opened either.
 */
export function groupClubsByCity<T extends GroupableClub>(
  clubs: readonly T[],
  locations: readonly ClubCityLocation[],
): ClubCityGroup<T>[] {
  const byId = new Map<string, ClubCityGroup<T>>(
    locations.map((location) => [
      location.id,
      {
        locationId: location.id,
        city: clubCityName(location),
        image: text(location.location_image),
        clubs: [],
      },
    ]),
  );
  clubs.forEach((club) => byId.get(text(club.location_id))?.clubs.push(club));
  return [...byId.values()]
    .filter((group) => group.clubs.length > 0)
    .sort((a, b) => a.city.localeCompare(b.city));
}

/** One group per locality, A→Z, with the clubs that name no area last. */
export function groupClubsByLocality<T extends GroupableClub>(
  clubs: readonly T[],
): ClubLocalityGroup<T>[] {
  const byLocality = new Map<string, T[]>();
  clubs.forEach((club) => {
    const locality = text(club.locality);
    const group = byLocality.get(locality);
    if (group) {
      group.push(club);
    } else {
      byLocality.set(locality, [club]);
    }
  });
  return [...byLocality.entries()]
    .map(([locality, grouped]) => ({ locality, clubs: grouped }))
    .sort((a, b) => {
      if (!a.locality || !b.locality) return Number(!a.locality) - Number(!b.locality);
      return a.locality.localeCompare(b.locality);
    });
}
