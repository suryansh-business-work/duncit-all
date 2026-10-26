/// <reference types="cypress" />
import { rest } from '../../../support/api-other';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The public developer REST API under /api/v1
 * (server/src/modules/venues/publicApi/venueApi.router.ts):
 *
 *   GET /api/v1/           unauthenticated index for a connectivity check
 *   every other route      requireApiKey (server/src/middleware/apiKey.ts):
 *                          no or unknown x-api-key → 401 {"error":"invalid_api_key"}
 *                          before the venue, the slot or the body is read
 *   anything unrouted      JSON 404 {"error":"not_found"}, never Express's HTML
 *
 * Reading venues/slots, booking, releasing, scope refusals and the 429 need an
 * API key issued for the run (see the run report). Scenario map: Other ›
 * Venue public API ("API key and request errors").
 */

const INVALID_KEY = { error: 'invalid_api_key' };
const SLOT_BOOKING = `/api/v1/venues/${NO_ID}/slots/${NO_ID}/book`;

const expectInvalidKey = (method: string, path: string, headers: Record<string, string> = {}) =>
  rest(method, path, { headers, body: method === 'POST' ? { external_ref: 'e2e-refused' } : undefined }).then((res) => {
    expect(res.status, `${method} ${path}`).to.equal(401);
    expect(res.body, `${method} ${path}`).to.deep.equal(INVALID_KEY);
  });

describe('API · The venue REST API refuses calls without a valid key', { testIsolation: false }, () => {
  it('VA-01 the index answers without a key', () => {
    rest('GET', '/api/v1/').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({ name: 'Duncit Venue API', version: 'v1', docs: 'https://developers.duncit.com' });
    });
  });

  it('VA-02 reading venues needs a key: none and an unknown one are 401', () => {
    expectInvalidKey('GET', '/api/v1/venues');
    expectInvalidKey('GET', '/api/v1/venues', { 'x-api-key': 'e2e-not-a-key' });
    expectInvalidKey('GET', `/api/v1/venues/${NO_ID}`, { 'x-api-key': 'e2e-not-a-key' });
  });

  it('VA-03 reading slots needs a key', () => {
    expectInvalidKey('GET', `/api/v1/venues/${NO_ID}/slots`);
  });

  it('VA-04 booking and releasing a slot need a key, so nothing is booked or released', () => {
    expectInvalidKey('POST', SLOT_BOOKING);
    expectInvalidKey('POST', SLOT_BOOKING, { 'x-api-key': '   ' });
    expectInvalidKey('DELETE', SLOT_BOOKING, { 'x-api-key': 'e2e-not-a-key' });
  });

  it('VA-05 an unrouted path is a JSON 404, not an HTML page', () => {
    rest('GET', '/api/v1/e2e-no-such-route').then((res) => {
      expect(res.status).to.equal(404);
      expect(res.headers['content-type']).to.include('application/json');
      expect(res.body).to.deep.equal({ error: 'not_found' });
    });
  });
});
