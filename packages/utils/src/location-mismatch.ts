/**
 * A pod, club or venue link carries the city it lives in. A viewer who has
 * their Duncit location set to a different city lands on that page with a feed,
 * a header and a set of clubs that all belong somewhere else — and nothing on
 * the page says so. This is the rule both apps ask before they open such a
 * page: are these two places different, and if so how does each one read?
 *
 * mWeb and the native app render their own dialog (rule 40: share the logic,
 * never the UI); the sentence inside it is decided here, once.
 */

/** One place: an admin Location row (a city) and, optionally, an area in it. */
export interface LocationPick {
  id?: string | null;
  /** The city as its header shows it — `location_name` on mWeb, `cityLabel` on native. */
  city?: string | null;
  /** The locality / zone inside that city, when one is picked. */
  zone?: string | null;
}

/** Everything the dialog states, resolved to text the reader can act on. */
export interface LocationMismatch {
  /** 'Mumbai' or 'Mumbai · Bandra' — where the viewer is browsing now. */
  current: string;
  /** The city alone, for the "Continue in Mumbai" button. */
  currentCity: string;
  /** 'Bengaluru' or 'Bengaluru · Indiranagar' — where the link points. */
  target: string;
  /** The city alone, for the "Switch to Bengaluru" button. */
  targetCity: string;
  /** The Location row the switch selects. */
  targetId: string;
  /** The area the switch selects with it — '' selects the whole city. */
  targetZone: string;
}

const text = (value?: string | null) => (value ?? '').trim();

/** 'Bengaluru · Indiranagar', or just the city when no area is picked. */
export function locationLabel(city?: string | null, zone?: string | null): string {
  const cityText = text(city);
  const zoneText = text(zone);
  if (!cityText) return zoneText;
  return zoneText ? `${cityText} · ${zoneText}` : cityText;
}

/**
 * Whether opening `target` contradicts the viewer's `current` selection.
 *
 * Compared at the CITY level: two areas of one city share a feed, so a link
 * into the next locality is not a change of place. Null whenever either side
 * is unknown — before the header has hydrated its selection, for an entity
 * that carries no location, or when a city id cannot be named — so a dialog
 * never opens over a half-loaded page or reads "switch to ".
 */
export function locationMismatch(
  current: LocationPick,
  target: LocationPick,
): LocationMismatch | null {
  const currentId = text(current.id);
  const targetId = text(target.id);
  if (!currentId || !targetId || currentId === targetId) return null;
  const currentCity = text(current.city);
  const targetCity = text(target.city);
  if (!currentCity || !targetCity) return null;
  return {
    current: locationLabel(currentCity, current.zone),
    currentCity,
    target: locationLabel(targetCity, target.zone),
    targetCity,
    targetId,
    targetZone: text(target.zone),
  };
}
