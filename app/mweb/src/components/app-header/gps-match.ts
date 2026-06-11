import type { GeocodedAddress } from './useGeoLocation';

export interface MatchableLocation {
  id: string;
  city?: string | null;
  state?: string | null;
  location_name?: string | null;
  location_pincode?: string | null;
  location_zones?: { zone_name: string; pincode?: string | null }[] | null;
}

const norm = (value?: string | null) => (value ?? '').trim().toLowerCase();

function matchByPincode(locations: MatchableLocation[], pincode: string) {
  const pin = pincode.trim();
  if (!pin) return null;
  return (
    locations.find(
      (l) =>
        (l.location_pincode ?? '').trim() === pin ||
        (l.location_zones ?? []).some((z) => (z.pincode ?? '').trim() === pin)
    ) ?? null
  );
}

function matchByName(locations: MatchableLocation[], city: string) {
  if (!city) return null;
  const exact = locations.find((l) => norm(l.city) === city || norm(l.location_name) === city);
  if (exact) return exact;
  // Looser containment handles "New Delhi" vs "Delhi", "Bengaluru Urban" vs "Bengaluru".
  return (
    locations.find((l) => {
      const lc = norm(l.city);
      const ln = norm(l.location_name);
      const cityHit = !!lc && (lc.includes(city) || city.includes(lc));
      const nameHit = !!ln && (ln.includes(city) || city.includes(ln));
      return cityHit || nameHit;
    }) ?? null
  );
}

/**
 * Resolve a geocoded address to one of our locations. Pincode is the strongest
 * signal (it survives city-name differences like Bengaluru/Bangalore); then we
 * fall back to an exact, then a containment, city/name match.
 */
export function matchLocation(
  locations: MatchableLocation[],
  addr: GeocodedAddress
): MatchableLocation | null {
  return matchByPincode(locations, addr.pincode) ?? matchByName(locations, norm(addr.city));
}

export function matchZone(location: MatchableLocation | null, pincode: string) {
  if (!location || !pincode) return '';
  const hit = (location.location_zones ?? []).find(
    (z) => (z.pincode ?? '').trim() === pincode.trim()
  );
  return hit?.zone_name ?? '';
}
