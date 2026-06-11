export interface MatchableLocation {
  id: string;
  city?: string | null;
  state?: string | null;
  location_name: string;
  location_pincode?: string | null;
  location_zones?: { zone_name: string; pincode?: string | null }[] | null;
}

const norm = (value?: string | null) => (value ?? '').trim().toLowerCase();

function matchByPincode<T extends MatchableLocation>(locations: T[], pincode?: string | null) {
  const pin = (pincode ?? '').trim();
  if (!pin) return null;
  return (
    locations.find(
      (l) =>
        (l.location_pincode ?? '').trim() === pin ||
        (l.location_zones ?? []).some((z) => (z.pincode ?? '').trim() === pin),
    ) ?? null
  );
}

function matchByName<T extends MatchableLocation>(locations: T[], city: string) {
  if (!city) return null;
  const exact = locations.find((l) => norm(l.city) === city || norm(l.location_name) === city);
  if (exact) return exact;
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

/** Resolve a geocoded city/pincode to one of our locations — pincode first
 * (survives Bengaluru/Bangalore-style name differences), then city/name. */
export function matchLocation<T extends MatchableLocation>(
  locations: T[],
  city: string,
  pincode?: string | null,
): T | null {
  return matchByPincode(locations, pincode) ?? matchByName(locations, norm(city));
}

export function matchZone(location: MatchableLocation, pincode?: string | null) {
  const pin = (pincode ?? '').trim();
  if (!pin) return '';
  return (
    (location.location_zones ?? []).find((z) => (z.pincode ?? '').trim() === pin)?.zone_name ?? ''
  );
}
