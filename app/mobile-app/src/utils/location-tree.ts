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

/** Subtitle for a city in the location picker: "128 Clubs" / "1 Club", or
 * "No Clubs Operating Yet" when none are live. Mirrors mWeb's util 1:1. */
export function clubCountLabel(count?: number | null): string {
  const n = count ?? 0;
  if (n <= 0) return 'No Clubs Operating Yet';
  return `${n} Club${n === 1 ? '' : 's'}`;
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

/** Builds the Google Maps embed URL for a place query, or '' when there is no
 * query. Always the keyless `output=embed` map: the Embed API needs per-key
 * enablement (the prod key lacks it — "Google Maps Embed API must be used in
 * the iframe"), while the keyless embed always renders. Same contract on
 * mWeb + mobile. The (unused) apiKey parameter is kept for call-site stability. */
export function locationMapEmbedUrl(_apiKey: string, query: string): string {
  if (!query) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
}

/**
 * Wraps the keyless embed URL in a minimal HTML document that renders it inside
 * an `<iframe>`. A react-native WebView is a top-level browsing context, and the
 * `output=embed` map refuses to render unframed ("Google Maps Embed API must be
 * used in the iframe"); framing it inside this HTML satisfies that check. mWeb
 * already embeds via a DOM `<iframe>`, so this keeps native at parity.
 */
export function mapEmbedHtml(url: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="${url}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></body></html>`;
}
