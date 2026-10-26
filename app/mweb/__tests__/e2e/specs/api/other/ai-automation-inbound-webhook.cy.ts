/// <reference types="cypress" />
import { rest } from '../../../support/api-other';

/**
 * AiSensy's inbound WhatsApp webhook, POST /automation/whatsapp/inbound
 * (server/src/modules/ai/automation/automation.router.ts). AiSensy signs
 * nothing, so the secret in `?secret=` or `x-webhook-secret` IS the gate: it is
 * compared in constant time against AISENSY_WEBHOOK_SECRET, an unset secret
 * matches nothing, and a refusal is 403 before the body is read — no run
 * starts, no message is sent. Scenario map: Other › AI Automation inbound
 * webhook ("Inbound webhook with wrong or missing secret is refused").
 *
 * The accepted path needs the real secret, which a nightly must never send.
 * Note for that row (not testable without the secret): the router has no body
 * parser of its own and server/src/index.ts mounts no global one (express.json
 * is only on /graphql and /logs), so req.body is undefined at
 * automation.router.ts:38 and every accepted message is answered
 * {"ok": true, "ignored": true} — the run never advances.
 */

const PATH = '/automation/whatsapp/inbound';
const REFUSED = { ok: false, error: 'Webhook secret missing or wrong' };
/** A text message in AiSensy's shape, from no real number. */
const MESSAGE = { data: { from: '910000000000', text: 'e2e', name: 'E2E' } };

const expectRefused = (init: { qs?: Record<string, string>; headers?: Record<string, string> }) =>
  rest('POST', PATH, { ...init, body: MESSAGE }).then((res) => {
    expect(res.status).to.equal(403);
    expect(res.body).to.deep.equal(REFUSED);
  });

describe('API · The automation inbound webhook refuses a missing or wrong secret', { testIsolation: false }, () => {
  it('AI-01 no secret at all is 403', () => {
    expectRefused({});
  });

  it('AI-02 a wrong ?secret= is 403', () => {
    expectRefused({ qs: { secret: 'e2e-wrong-secret' } });
  });

  it('AI-03 a wrong x-webhook-secret header is 403', () => {
    expectRefused({ headers: { 'x-webhook-secret': 'e2e-wrong-secret' } });
  });

  it('AI-04 an empty ?secret= never matches, even if the server had none set', () => {
    // The query value wins over the header, so an empty one must not fall through to "equal".
    expectRefused({ qs: { secret: '' }, headers: { 'x-webhook-secret': 'e2e-wrong-secret' } });
  });
});
