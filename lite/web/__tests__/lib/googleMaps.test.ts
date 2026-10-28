import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceHandle, PlaceSuggestion } from '../../lib/googleMaps';

/** googleMaps keeps one load per page in module state, so every case starts from a fresh copy. */
const load = async () => import('../../lib/googleMaps');

const SCRIPT_ID = 'lite-google-maps';
const scripts = () => [...document.head.querySelectorAll<HTMLScriptElement>(`script#${SCRIPT_ID}`)];

/** A stand-in for the Places library: only what Lite calls. */
const placesLibrary = (suggestions: unknown[] = []) => ({
  AutocompleteSessionToken: class {},
  AutocompleteSuggestion: { fetchAutocompleteSuggestions: vi.fn().mockResolvedValue({ suggestions }) },
});

/** Put a `google` global on the page, as the Maps script does once it has run. */
const installGoogle = (library: ReturnType<typeof placesLibrary>) => {
  const importLibrary = vi.fn().mockResolvedValue(library);
  Object.assign(globalThis, { google: { maps: { importLibrary } } });
  return importLibrary;
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'google');
  for (const script of scripts()) script.remove();
});

describe('loadPlaces', () => {
  it('uses Maps already on the page without adding the script again', async () => {
    const library = placesLibrary();
    const importLibrary = installGoogle(library);
    const { loadPlaces } = await load();

    await expect(loadPlaces('browser-key')).resolves.toBe(library);
    expect(importLibrary).toHaveBeenCalledWith('places');
    expect(scripts()).toHaveLength(0);
  });

  it('adds the Maps script once, with the encoded key, and resolves the Places library once it loads', async () => {
    const { loadPlaces } = await load();
    const first = loadPlaces('key with &');
    const second = loadPlaces('key with &');

    expect(second).toBe(first);
    expect(scripts()).toHaveLength(1);
    const [script] = scripts();
    expect(script?.async).toBe(true);
    const src = new URL(script?.src ?? '');
    expect(src.origin + src.pathname).toBe('https://maps.googleapis.com/maps/api/js');
    expect(src.searchParams.get('key')).toBe('key with &');
    expect(src.searchParams.get('libraries')).toBe('places');
    expect(src.searchParams.get('loading')).toBe('async');

    const library = placesLibrary();
    installGoogle(library);
    script?.dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(library);
  });

  it('rejects when the script cannot load, and tries again on the next call', async () => {
    const { loadPlaces } = await load();
    const attempt = loadPlaces('browser-key');
    scripts()[0]?.dispatchEvent(new Event('error'));
    await expect(attempt).rejects.toThrow('Google Maps could not be loaded');

    const retry = loadPlaces('browser-key');
    expect(retry).not.toBe(attempt);
    expect(scripts()).toHaveLength(2);
    retry.catch(() => undefined);
    scripts()[1]?.dispatchEvent(new Event('error'));
    await expect(retry).rejects.toThrow('Google Maps could not be loaded');
  });

  it('rejects when the script loaded but Maps never started', async () => {
    const { loadPlaces } = await load();
    const attempt = loadPlaces('browser-key');
    scripts()[0]?.dispatchEvent(new Event('load'));
    await expect(attempt).rejects.toThrow('Google Maps did not start');
  });
});

describe('suggestPlaces', () => {
  it('asks Places with the typed text and the session token, and maps each prediction', async () => {
    const toPlace = vi.fn();
    const library = placesLibrary([
      { placePrediction: { placeId: 'p-1', mainText: { text: 'Rajouri Garden' }, secondaryText: { text: 'New Delhi, Delhi, India' }, toPlace } },
      { placePrediction: null },
      { placePrediction: { placeId: 'p-2', mainText: null, secondaryText: null, toPlace } },
    ]);
    const { suggestPlaces } = await load();
    const token = { session: 1 };

    const suggestions = await suggestPlaces(library, 'rajouri', token);

    expect(library.AutocompleteSuggestion.fetchAutocompleteSuggestions).toHaveBeenCalledWith({ input: 'rajouri', sessionToken: token });
    expect(suggestions.map(({ placeId, main, secondary }) => ({ placeId, main, secondary }))).toEqual([
      { placeId: 'p-1', main: 'Rajouri Garden', secondary: 'New Delhi, Delhi, India' },
      { placeId: 'p-2', main: '', secondary: '' },
    ]);
    expect(suggestions[0]?.toPlace).toBe(toPlace);
  });

  it('gives an empty list when Places has nothing', async () => {
    const { suggestPlaces } = await load();
    await expect(suggestPlaces(placesLibrary([]), 'zzz', {})).resolves.toEqual([]);
  });
});

describe('resolvePlace', () => {
  const suggestion = (place: PlaceHandle): PlaceSuggestion => ({ placeId: 'p-1', main: 'Rajouri Garden', secondary: 'New Delhi, Delhi, India', toPlace: () => place });

  it('fetches the five fields and keeps the name, address, point and locality', async () => {
    const fetchFields = vi.fn().mockResolvedValue({});
    const place: PlaceHandle = {
      fetchFields,
      id: 'place-42',
      displayName: 'Rajouri Garden Metro',
      formattedAddress: 'Rajouri Garden, New Delhi, Delhi 110027, India',
      location: { lat: () => 28.649, lng: () => 77.122 },
      addressComponents: [
        { longText: 'Rajouri Garden', types: ['sublocality', 'political'] },
        { longText: 'New Delhi', types: ['locality', 'political'] },
      ],
    };
    const { resolvePlace } = await load();

    await expect(resolvePlace(suggestion(place))).resolves.toEqual({
      placeId: 'place-42',
      name: 'Rajouri Garden Metro',
      address: 'Rajouri Garden, New Delhi, Delhi 110027, India',
      lat: 28.649,
      lng: 77.122,
      city: 'New Delhi',
    });
    expect(fetchFields).toHaveBeenCalledWith({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'] });
  });

  it("falls back to the suggestion's own words when the place comes back bare", async () => {
    const place: PlaceHandle = { fetchFields: vi.fn().mockResolvedValue({}), displayName: null, formattedAddress: null, location: null, addressComponents: null };
    const { resolvePlace } = await load();

    await expect(resolvePlace(suggestion(place))).resolves.toEqual({
      placeId: 'p-1',
      name: 'Rajouri Garden',
      address: 'New Delhi, Delhi, India',
      lat: 0,
      lng: 0,
      city: '',
    });
  });

  it('leaves the city blank when no component is a locality', async () => {
    const place: PlaceHandle = {
      fetchFields: vi.fn().mockResolvedValue({}),
      addressComponents: [{ longText: 'Delhi', types: ['administrative_area_level_1'] }],
    };
    const { resolvePlace } = await load();
    await expect(resolvePlace(suggestion(place))).resolves.toMatchObject({ city: '' });
  });
});

describe('mapsLink and embedMapUrl', () => {
  it('links to the place on Google Maps by name, address and place id', async () => {
    const { mapsLink } = await load();
    const link = new URL(mapsLink({ placeId: 'place 42', name: 'Lodhi Garden', address: 'Lodhi Road, New Delhi' }));
    expect(link.origin + link.pathname).toBe('https://www.google.com/maps/search/');
    expect(link.searchParams.get('api')).toBe('1');
    expect(link.searchParams.get('query')).toBe('Lodhi Garden Lodhi Road, New Delhi');
    expect(link.searchParams.get('query_place_id')).toBe('place 42');
  });

  it('does not leave a trailing space when there is no address', async () => {
    const { mapsLink } = await load();
    expect(new URL(mapsLink({ placeId: 'p', name: 'Lodhi Garden', address: '' })).searchParams.get('query')).toBe('Lodhi Garden');
  });

  it('embeds the place itself when it has a place id', async () => {
    const { embedMapUrl } = await load();
    const url = new URL(embedMapUrl('browser key', { placeId: 'place-42', lat: 28.6, lng: 77.2 }));
    expect(url.pathname).toBe('/maps/embed/v1/place');
    expect(url.searchParams.get('key')).toBe('browser key');
    expect(url.searchParams.get('q')).toBe('place_id:place-42');
  });

  it('embeds a view centred on the point when there is no place id', async () => {
    const { embedMapUrl } = await load();
    const url = new URL(embedMapUrl('browser-key', { placeId: null, lat: 28.6, lng: 77.2 }));
    expect(url.pathname).toBe('/maps/embed/v1/view');
    expect(url.searchParams.get('center')).toBe('28.6,77.2');
    expect(url.searchParams.get('zoom')).toBe('15');
  });
});
