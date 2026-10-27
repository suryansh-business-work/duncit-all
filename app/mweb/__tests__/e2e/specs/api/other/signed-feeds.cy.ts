/// <reference types="cypress" />
import { forgedSignedLink, rest, textOf } from '../../../support/api-other';

/**
 * Feeds and files with no session, where a key or a signed link is the whole
 * credential:
 *
 *   GET /tickets/:token/ticket.pdf   modules/pods/ticket/ticket.router.ts — a
 *        30-minute signed link naming one ticket; anything else is 404 "Not found"
 *   GET /telemetry/logs.json|bugs.json   modules/platform/telemetry/telemetry.router.ts —
 *        the Telemetry Settings key (query or x-telemetry-key), compared in
 *        constant time; anything else is 401 UNAUTHORIZED, never cached
 *
 * Scenario map: Other › Signed feeds. The 200 feeds need the telemetry key and
 * a real ticket link (see the run report).
 */

const TELEMETRY_REFUSAL = {
  error: 'UNAUTHORIZED',
  message:
    'This feed needs the telemetry key. Copy a fresh URL from Tech → Telemetry, or rotate the key if this one was retired.',
};

const expectTicketRefused = (token: string) =>
  rest('GET', `/tickets/${token}/ticket.pdf`).then((res) => {
    expect(res.status).to.equal(404);
    expect(textOf(res.body)).to.equal('Not found\n');
    expect(res.headers['content-type']).not.to.include('application/pdf');
    expect(res.headers['cache-control']).to.equal('no-store, max-age=0');
  });

const expectTelemetryRefused = (path: string, init: { qs?: Record<string, string>; headers?: Record<string, string> }) =>
  rest('GET', path, init).then((res) => {
    expect(res.status, path).to.equal(401);
    expect(res.body, path).to.deep.equal(TELEMETRY_REFUSAL);
    expect(res.headers['cache-control'], path).to.equal('no-store, max-age=0');
    expect(res.headers['x-robots-tag'], path).to.equal('noindex, nofollow');
  });

describe('API · Signed ticket links and keyed telemetry feeds refuse bad credentials', { testIsolation: false }, () => {
  it('SF-01 a ticket link that is not a signed token is 404 "Not found"', () => {
    expectTicketRefused('not-a-token');
  });

  it('SF-02 a ticket link with a forged signature is 404, never a PDF', () => {
    expectTicketRefused(forgedSignedLink());
  });

  it('SF-03 the telemetry logs feed refuses no key, a wrong key and a wrong header key', () => {
    expectTelemetryRefused('/telemetry/logs.json', {});
    expectTelemetryRefused('/telemetry/logs.json', { qs: { key: 'e2e-wrong-key', level: 'error' } });
    expectTelemetryRefused('/telemetry/logs.json', { headers: { 'x-telemetry-key': 'e2e-wrong-key' } });
  });

  it('SF-04 the telemetry bugs feed refuses the same way', () => {
    expectTelemetryRefused('/telemetry/bugs.json', {});
    expectTelemetryRefused('/telemetry/bugs.json', { qs: { key: 'e2e-wrong-key', status: 'OPEN' } });
  });
});
