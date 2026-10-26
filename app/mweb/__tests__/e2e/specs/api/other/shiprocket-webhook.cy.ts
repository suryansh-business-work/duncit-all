/// <reference types="cypress" />
import { rest } from '../../../support/api-other';

/**
 * ShipRocket's tracking webhook, POST /webhooks/courier-updates
 * (server/src/modules/commerce/shiprocket/shiprocket.webhook.ts). ShipRocket
 * signs nothing; it sends the x-api-key we gave it. A courier status is what
 * marks a COD order paid, so an unauthenticated "DELIVERED" must never be
 * applied:
 *
 *   keys configured, header missing/wrong  → 401 {"ok": false}
 *   no key configured anywhere             → 200 {"ok": false}, body ignored
 *   either way                             → applyWebhookEvent never runs
 *
 * Which of the two the staging server is in depends on its Tech portal
 * settings, so the status is asserted as one of those two and the body as the
 * refusal both share. Only {"ok": true} means an update was applied, and that
 * needs the real key (see the run report). Scenario map: Other › ShipRocket
 * webhook ("Webhook negative paths").
 */

const PATH = '/webhooks/courier-updates';
/** Shaped like a real update, naming no order, so even a broken key check finds nothing to change. */
const UPDATE = { awb: 'E2E-NO-SUCH-AWB', order_id: 'e2e-no-such-order', current_status: 'DELIVERED' };

const expectIgnored = (headers: Record<string, string>) =>
  rest<{ ok: boolean }>('POST', PATH, { headers, body: UPDATE }).then((res) => {
    expect(res.status, 'refused (401) or ignored for want of a key (200)').to.be.oneOf([200, 401]);
    expect(res.body).to.deep.equal({ ok: false });
  });

describe('API · The courier webhook ignores updates without the right key', { testIsolation: false }, () => {
  it('SR-01 an update with no x-api-key is not applied', () => {
    expectIgnored({});
  });

  it('SR-02 an update with a wrong x-api-key is not applied', () => {
    expectIgnored({ 'x-api-key': 'e2e-wrong-key' });
  });

  it('SR-03 a blank x-api-key is treated as missing, never as a match for an unset key', () => {
    expectIgnored({ 'x-api-key': '   ' });
  });

  it('SR-04 a body that is not JSON is rejected by the parser before the key is read', () => {
    rest('POST', PATH, {
      headers: { 'content-type': 'application/json', 'x-api-key': 'e2e-wrong-key' },
      body: '{"awb": ',
    }).then((res) => {
      expect(res.status).to.equal(400);
    });
  });

  it('SR-05 the old ShipRocket-named path does not exist', () => {
    // ShipRocket refuses webhook URLs naming it, so the route lives at the neutral path only.
    rest('POST', '/shiprocket/webhook', { body: UPDATE }).then((res) => {
      expect(res.status).to.equal(404);
    });
  });
});
