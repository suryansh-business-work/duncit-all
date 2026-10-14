/// <reference types="cypress" />
import { rest } from '../../../support/api-other';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The CRM softphone's Twilio webhooks (server/src/modules/crm/call/call.webhook.ts,
 * mounted at /twilio). Twilio posts urlencoded bodies and the server answers TwiML.
 * Scenario map: Other › Twilio calls ("Portal call bridging and status").
 *
 * Like /twilio/recordings, every route refuses anything Twilio did not sign
 * (twilioWebhookGuard.ts). The payloads name no log and no user, so even a
 * broken guard would change nothing.
 */

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const UNSIGNED_STATUS = { CallStatus: 'completed', CallDuration: '1' };

describe('API · Twilio call webhooks accept only what Twilio signed', { testIsolation: false }, () => {
  it('TC-01 a cached AI audio clip that does not exist is 404', () => {
    rest('GET', '/twilio/ai-audio/e2e-no-such-clip').then((res) => {
      expect(res.status).to.equal(404);
      expect(res.body).to.be.oneOf(['', undefined, null]);
    });
  });

  // Every Twilio callback route checks X-Twilio-Signature (twilioWebhookGuard.ts).
  it('TC-02 an unsigned call-status callback is refused with 403 and changes nothing', () => {
    rest('POST', '/twilio/call-status', {
      qs: { logId: NO_ID, userId: NO_ID, mode: 'PORTAL' },
      form: true,
      body: UNSIGNED_STATUS,
    }).then((res) => {
      expect(res.status).to.equal(403);
      expect(res.body).not.to.equal(EMPTY_TWIML);
    });
  });

  it('TC-03 an unsigned portal-bridge request gets no dial TwiML', () => {
    rest('POST', '/twilio/voice/portal', {
      qs: { logId: NO_ID, userId: NO_ID, agent: '+10000000000' },
      form: true,
      body: { CallSid: 'CAe2e' },
    }).then((res) => {
      expect(res.status).to.equal(403);
      expect(String(res.body)).not.to.include('<Dial');
    });
  });
});
