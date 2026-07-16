import { describe, expect, it } from 'vitest';
import { API_BASE, API_ENDPOINTS, buildCurl, buildPath, type ApiEndpoint } from '../../src/pages/api-docs/apiReference';

const bookSlot = API_ENDPOINTS.find((e) => e.id === 'book-slot')!;
const venueSlots = API_ENDPOINTS.find((e) => e.id === 'venue-slots')!;
const listVenues = API_ENDPOINTS.find((e) => e.id === 'list-venues')!;

describe('apiReference', () => {
  it('derives the REST base from the graphql url (strips /graphql, adds /api/v1)', () => {
    expect(API_BASE.endsWith('/api/v1')).toBe(true);
    expect(API_BASE).not.toContain('/graphql');
  });

  it('exposes the five documented endpoints', () => {
    expect(API_ENDPOINTS.map((e) => e.id)).toEqual([
      'list-venues',
      'get-venue',
      'venue-slots',
      'book-slot',
      'cancel-booking',
    ]);
  });

  describe('buildPath', () => {
    it('leaves a param-free path untouched', () => {
      expect(buildPath(listVenues, {})).toBe('/venues');
    });

    it('substitutes filled path tokens', () => {
      expect(buildPath(bookSlot, { venueId: 'v1', slotId: 's1' })).toBe('/venues/v1/slots/s1/book');
    });

    it('keeps the {token} placeholder when a path value is missing or blank', () => {
      expect(buildPath(bookSlot, { venueId: '  ', slotId: 's1' })).toBe(
        '/venues/{venueId}/slots/s1/book',
      );
    });

    it('appends only the filled query params, url-encoded', () => {
      expect(buildPath(venueSlots, { venueId: 'v1', from: '2026-01-01T00:00:00Z', to: '  ' })).toBe(
        '/venues/v1/slots?from=2026-01-01T00%3A00%3A00Z',
      );
    });

    it('omits the query string when no query params are filled', () => {
      expect(buildPath(venueSlots, { venueId: 'v1' })).toBe('/venues/v1/slots');
    });
  });

  describe('buildCurl', () => {
    it('renders a GET curl with the placeholder key when none is provided', () => {
      const curl = buildCurl(listVenues, {}, '');
      expect(curl).toContain(`curl -X GET '${API_BASE}/venues'`);
      expect(curl).toContain("x-api-key: YOUR_API_KEY");
      expect(curl).not.toContain('Content-Type');
    });

    it('uses the supplied api key', () => {
      const curl = buildCurl(listVenues, {}, 'dk_live_x');
      expect(curl).toContain('x-api-key: dk_live_x');
    });

    it('adds a JSON body + Content-Type when body params are filled', () => {
      const curl = buildCurl(bookSlot, { venueId: 'v1', slotId: 's1', external_ref: 'order-1' }, 'k');
      expect(curl).toContain('Content-Type: application/json');
      expect(curl).toContain(`-d '${JSON.stringify({ external_ref: 'order-1' })}'`);
    });

    it('omits the body when body params are blank', () => {
      const curl = buildCurl(bookSlot, { venueId: 'v1', slotId: 's1', external_ref: '   ' }, 'k');
      expect(curl).not.toContain('Content-Type');
      expect(curl).not.toContain('-d ');
    });
  });

  it('every endpoint carries a non-empty sample response and typed method', () => {
    const methods = new Set(['GET', 'POST', 'DELETE']);
    (API_ENDPOINTS as ApiEndpoint[]).forEach((e) => {
      expect(e.sampleResponse.length).toBeGreaterThan(0);
      expect(methods.has(e.method)).toBe(true);
    });
  });
});
