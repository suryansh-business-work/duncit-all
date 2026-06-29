// Builds a country → state → city tree from the flat `locations` payload so the
// picker can drill down. Pure data helpers (no React) — mirrored 1:1 in the
// mobile app so both experiences stay identical.

export interface LocationLike {
  id: string;
  location_name: string;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  country?: string | null;
  country_code?: string | null;
  location_image?: string | null;
  location_pincode?: string | null;
  location_zones?: { zone_name: string; pincode?: string | null }[] | null;
  active_club_count?: number | null;
}

/** Subtitle for a city in the location picker: "128 Clubs" / "1 Club", or
 *  "No Clubs Operating Yet" when none are live. Mirrored 1:1 in the mobile app. */
export function clubCountLabel(count?: number | null): string {
  const n = count ?? 0;
  if (n <= 0) return 'No Clubs Operating Yet';
  return `${n} Club${n === 1 ? '' : 's'}`;
}

export interface CountryNode {
  country: string;
  country_code: string;
  states: StateNode[];
}

export interface StateNode {
  state: string;
  state_code: string;
  cities: LocationLike[];
}

/** Country flag image (works on web + Android, unlike ISO emoji flags). */
export function countryFlagUrl(countryCode?: string | null): string {
  const code = (countryCode ?? '').trim().toLowerCase();
  return code ? `https://flagcdn.com/24x18/${code}.png` : '';
}

function upsert<T>(list: T[], match: (item: T) => boolean, create: () => T): T {
  const found = list.find(match);
  if (found) return found;
  const created = create();
  list.push(created);
  return created;
}

/** Groups active locations into a sorted country → state → city tree. */
export function buildLocationTree(locations: LocationLike[]): CountryNode[] {
  const countries: CountryNode[] = [];
  for (const loc of locations) {
    const country = (loc.country ?? '').trim() || 'Other';
    const countryCode = (loc.country_code ?? '').trim();
    const state = (loc.state ?? '').trim() || 'Other';
    const stateCode = (loc.state_code ?? '').trim();

    const countryNode = upsert(
      countries,
      (c) => c.country === country,
      () => ({ country, country_code: countryCode, states: [] }),
    );
    const stateNode = upsert(
      countryNode.states,
      (s) => s.state === state,
      () => ({ state, state_code: stateCode, cities: [] }),
    );
    stateNode.cities.push(loc);
  }
  const byName = <T extends { country?: string; state?: string }>(a: T, b: T) =>
    (a.country ?? a.state ?? '').localeCompare(b.country ?? b.state ?? '');
  countries.sort(byName);
  for (const c of countries) {
    c.states.sort(byName);
    for (const s of c.states) {
      s.cities.sort((a, b) => a.location_name.localeCompare(b.location_name));
    }
  }
  return countries;
}

/** Human-readable query for the Google Maps embed/search of a selection. */
export function locationMapQuery(
  city?: string | null,
  zoneName?: string | null,
  pincode?: string | null,
  country?: string | null,
): string {
  return [zoneName, city, pincode, country].map((v) => (v ?? '').trim()).filter(Boolean).join(', ');
}
