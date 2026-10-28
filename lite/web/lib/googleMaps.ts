/**
 * Google Maps JavaScript API, loaded on demand with the console's browser key
 * (Environment → Google Maps), and only the handful of Places calls Lite makes.
 * The types below describe just those calls, so no @types package is needed.
 */
export interface PlaceSuggestion {
  placeId: string;
  /** "Rajouri Garden" */
  main: string;
  /** "New Delhi, Delhi, India" */
  secondary: string;
  toPlace: () => PlaceHandle;
}

export interface PlaceHandle {
  fetchFields: (request: { fields: string[] }) => Promise<unknown>;
  id?: string;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: { lat: () => number; lng: () => number } | null;
  addressComponents?: { longText?: string | null; types: string[] }[] | null;
}

export interface PickedPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** The locality ("New Delhi"), for matching one of Lite's cities. */
  city: string;
}

interface PlacesLibrary {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: { input: string; sessionToken: unknown }) => Promise<{
      suggestions: { placePrediction: { placeId: string; mainText?: { text: string } | null; secondaryText?: { text: string } | null; toPlace: () => PlaceHandle } | null }[];
    }>;
  };
}

interface GoogleGlobal {
  maps: { importLibrary: (name: 'places') => Promise<PlacesLibrary> };
}

const SCRIPT_ID = 'lite-google-maps';
let loading: Promise<PlacesLibrary> | null = null;

const googleOf = (): GoogleGlobal | undefined => (globalThis as unknown as { google?: GoogleGlobal }).google;

/** Load the Maps script once per page, then the Places library. */
export function loadPlaces(apiKey: string): Promise<PlacesLibrary> {
  loading ??= new Promise<void>((resolve, reject) => {
    if (googleOf()?.maps?.importLibrary) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps could not be loaded'));
    document.head.append(script);
  })
    .then(() => {
      const google = googleOf();
      if (!google) throw new Error('Google Maps did not start');
      return google.maps.importLibrary('places');
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}

/** Suggestions for what the host has typed so far. One session token spans a search and its pick (Google bills it once). */
export async function suggestPlaces(places: PlacesLibrary, input: string, sessionToken: unknown): Promise<PlaceSuggestion[]> {
  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken });
  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ placeId: p.placeId, main: p.mainText?.text ?? '', secondary: p.secondaryText?.text ?? '', toPlace: p.toPlace }));
}

/** The fields the event form keeps from a picked suggestion. */
export async function resolvePlace(suggestion: PlaceSuggestion): Promise<PickedPlace> {
  const place = suggestion.toPlace();
  await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'] });
  const locality = place.addressComponents?.find((c) => c.types.includes('locality'))?.longText ?? '';
  return {
    placeId: place.id ?? suggestion.placeId,
    name: place.displayName ?? suggestion.main,
    address: place.formattedAddress ?? suggestion.secondary,
    lat: place.location?.lat() ?? 0,
    lng: place.location?.lng() ?? 0,
    city: locality,
  };
}

/** A link that opens the place in Google Maps on any device. */
export const mapsLink = (place: Pick<PickedPlace, 'placeId' | 'name' | 'address'>): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address}`.trim())}&query_place_id=${encodeURIComponent(place.placeId)}`;

/** An embeddable map of a point (the Maps Embed API, same browser key). */
export const embedMapUrl = (apiKey: string, place: { placeId?: string | null; lat: number; lng: number }): string =>
  place.placeId
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=place_id:${encodeURIComponent(place.placeId)}`
    : `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(apiKey)}&center=${place.lat},${place.lng}&zoom=15`;
