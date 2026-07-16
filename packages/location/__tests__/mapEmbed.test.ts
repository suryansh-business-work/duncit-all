import { describe, it, expect } from 'vitest';
import { buildMapQuery, mapEmbedUrl, mapSearchUrl } from '../src/mapEmbed';

describe('buildMapQuery', () => {
  it('returns "lat,lng" when both coordinates are present, ignoring parts', () => {
    expect(buildMapQuery(['ignored'], 12.9716, 77.5946)).toBe('12.9716,77.5946');
  });

  it('falls back to joined address parts when lat is missing', () => {
    expect(buildMapQuery(['123 Main St', 'Bengaluru'], undefined, 77.5946)).toBe('123 Main St, Bengaluru');
  });

  it('falls back to joined address parts when lng is missing', () => {
    expect(buildMapQuery(['123 Main St', 'Bengaluru'], 12.9716, null)).toBe('123 Main St, Bengaluru');
  });

  it('trims whitespace and drops blank/nullish parts', () => {
    expect(buildMapQuery(['  Koramangala  ', '', null, undefined, '  '])).toBe('Koramangala');
  });

  it('returns an empty string when nothing usable is provided', () => {
    expect(buildMapQuery()).toBe('');
  });
});

describe('mapEmbedUrl', () => {
  it('returns an empty string for an empty query', () => {
    expect(mapEmbedUrl('')).toBe('');
  });

  it('builds the keyed Embed API url with the default zoom', () => {
    expect(mapEmbedUrl('Bengaluru, India', { apiKey: 'key/123' })).toBe(
      'https://www.google.com/maps/embed/v1/place?key=key%2F123&q=Bengaluru%2C%20India&zoom=15',
    );
  });

  it('builds the keyed Embed API url with a custom zoom', () => {
    expect(mapEmbedUrl('Bengaluru', { apiKey: 'key123', zoom: 10 })).toBe(
      'https://www.google.com/maps/embed/v1/place?key=key123&q=Bengaluru&zoom=10',
    );
  });

  it('builds the keyless map url with the default zoom when no apiKey is given', () => {
    expect(mapEmbedUrl('Bengaluru, India')).toBe(
      'https://maps.google.com/maps?q=Bengaluru%2C%20India&z=14&output=embed',
    );
  });

  it('builds the keyless map url with a custom zoom', () => {
    expect(mapEmbedUrl('Bengaluru', { zoom: 8 })).toBe('https://maps.google.com/maps?q=Bengaluru&z=8&output=embed');
  });

  it('falls back to the keyless url when apiKey is an empty string', () => {
    expect(mapEmbedUrl('Bengaluru', { apiKey: '' })).toBe(
      'https://maps.google.com/maps?q=Bengaluru&z=14&output=embed',
    );
  });
});

describe('mapSearchUrl', () => {
  it('builds a maps search deep link with an encoded query', () => {
    expect(mapSearchUrl('Bengaluru, India')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Bengaluru%2C%20India',
    );
  });
});
