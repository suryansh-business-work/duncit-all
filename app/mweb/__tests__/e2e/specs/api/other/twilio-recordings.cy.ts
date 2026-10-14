/// <reference types="cypress" />
import { rest } from '../../../support/api-other';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The recorded-call callback, POST /twilio/recordings
 * (server/src/modules/crm/call/recordingWebhook.ts). Research flagged it as
 * having no credential check; it has one today: unless X-Twilio-Signature is
 * Twilio's HMAC of the configured webhook URL + form body
 * (twilioSignature.ts, constant-time), the answer is 403 with an empty body
 * and no recording is attached. Scenario map: Other › Twilio recordings.
 *
 * The 204 path needs a body signed with the Twilio auth token, which the
 * suite never holds.
 */

const RECORDING = {
  CallSid: 'CAe2e',
  RecordingSid: 'REe2e',
  RecordingUrl: 'https://example.com/e2e-recording',
  RecordingDuration: '1',
};

const expectRefused = (headers: Record<string, string>) =>
  rest('POST', '/twilio/recordings', { qs: { contactActionId: NO_ID }, form: true, body: RECORDING, headers }).then(
    (res) => {
      expect(res.status).to.equal(403);
      expect(res.body).to.be.oneOf(['', undefined, null]);
    },
  );

describe('API · The Twilio recording callback refuses unsigned requests', { testIsolation: false }, () => {
  it('TR-01 a callback with no X-Twilio-Signature is 403', () => {
    expectRefused({});
  });

  it('TR-02 a callback with a made-up signature is 403', () => {
    // Base64 of a SHA-1 HMAC is 28 characters; this one is the right length and wrong.
    expectRefused({ 'x-twilio-signature': `${'A'.repeat(27)}=` });
  });
});
