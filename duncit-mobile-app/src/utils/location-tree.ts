import type { LocationItem } from '@/stores/location.store';

/** A country → state → city tree built from the flat `locations` payload, so the
 * picker can drill down. Mirrors mWeb's util 1:1 so both apps behave identically. */
export interface StateNode {
  state: string;
  state_code: string;
  cities: LocationItem[];
}

export interface CountryNode {
  country: string;
  country_code: string;
  states: StateNode[];
}

/** Country flag image (renders on web + Android, unlike ISO emoji flags). */
export function countryFlagUrl(countryCode?: string | null): string {
  const code = (countryCode ?? '').trim().toLowerCase();
  return code ? `https://flagcdn.com/48x36/${code}.png` : '';
}

function upsert<T>(list: T[], match: (item: T) => boolean, create: () => T): T {
  const found = list.find(match);
  if (found) return found;
  const created = create();
  list.push(created);
  return created;
}

/** Groups active locations into a sorted country → state → city tree. */
export function buildLocationTree(locations: LocationItem[]): CountryNode[] {
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
  countries.sort((a, b) => a.country.localeCompare(b.country));
  for (const c of countries) {
    c.states.sort((a, b) => a.state.localeCompare(b.state));
    for (const s of c.states) {
      s.cities.sort((a, b) => a.location_name.localeCompare(b.location_name));
    }
  }
  return countries;
}

/** Human-readable query for the Google Maps embed of a selection. */
export function locationMapQuery(
  city?: string | null,
  zoneName?: string | null,
  pincode?: string | null,
  country?: string | null,
): string {
  return [zoneName, city, pincode, country]
    .map((v) => (v ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/** Builds the Google Maps Embed URL for the selection, or '' when unusable. */
export function locationMapEmbedUrl(apiKey: string, query: string): string {
  if (!apiKey || !query) return '';
  return (
    'https://www.google.com/maps/embed/v1/place?key=' +
    encodeURIComponent(apiKey) +
    '&q=' +
    encodeURIComponent(query) +
    '&zoom=12'
  );
}
