import type { LocationDoc } from './types';

export interface Option {
  label: string;
  value: string;
}
export interface CityOption extends Option {
  /** The Location document id backing this city. */
  location_id: string;
}
export interface LocalityOption extends Option {
  pincode: string;
}

const byLabel = (a: Option, b: Option) => a.label.localeCompare(b.label);

/** Distinct countries (value = country_code). */
export function countryOptions(locations: LocationDoc[]): Option[] {
  const seen = new Map<string, string>();
  for (const loc of locations) {
    if (loc.country_code && !seen.has(loc.country_code)) seen.set(loc.country_code, loc.country);
  }
  return Array.from(seen, ([value, label]) => ({ value, label })).sort(byLabel);
}

/** Distinct states within a country (value = state name — state_code isn't always set). */
export function stateOptions(locations: LocationDoc[], countryCode: string): Option[] {
  const seen = new Set<string>();
  const out: Option[] = [];
  for (const loc of locations) {
    if (countryCode && loc.country_code !== countryCode) continue;
    if (loc.state && !seen.has(loc.state)) {
      seen.add(loc.state);
      out.push({ value: loc.state, label: loc.state });
    }
  }
  return out.sort(byLabel);
}

/** Distinct cities within a state, each carrying its Location doc id. */
export function cityOptions(locations: LocationDoc[], countryCode: string, state: string): CityOption[] {
  const seen = new Set<string>();
  const out: CityOption[] = [];
  for (const loc of locations) {
    if (countryCode && loc.country_code !== countryCode) continue;
    if (state && loc.state !== state) continue;
    if (loc.city && !seen.has(loc.city)) {
      seen.add(loc.city);
      out.push({ value: loc.city, label: loc.city, location_id: loc.id });
    }
  }
  return out.sort(byLabel);
}

/** Zones/localities of the selected city's Location doc. */
export function localityOptions(locations: LocationDoc[], locationId: string): LocalityOption[] {
  const doc = locations.find((loc) => loc.id === locationId);
  if (!doc) return [];
  return (doc.location_zones ?? [])
    .filter((zone) => zone.zone_name)
    .map((zone) => ({ value: zone.zone_name, label: zone.zone_name, pincode: zone.pincode ?? '' }))
    .sort(byLabel);
}

/** The city doc's default pincode (used when no zone is selected). */
export function cityPincode(locations: LocationDoc[], locationId: string): string {
  return locations.find((loc) => loc.id === locationId)?.location_pincode ?? '';
}
