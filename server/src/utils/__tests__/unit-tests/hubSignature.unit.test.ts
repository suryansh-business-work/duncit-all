/**
 * `X-Hub-Signature-256`, as GitHub and Meta sign webhooks: the HMAC-SHA256 of
 * the exact raw body with the app secret, in constant-time comparison.
 */
import { createHmac } from 'node:crypto';
import { validHubSignature } from '../../hubSignature';

const body = Buffer.from('{"object":"instagram","entry":[]}');
const sign = (secret: string, payload: Buffer = body) => `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

describe('validHubSignature', () => {
  it('accepts the body signed with the secret', () => {
    expect(validHubSignature('app-secret', body, sign('app-secret'))).toBe(true);
  });

  it('refuses another secret, a changed body, and an empty secret', () => {
    expect(validHubSignature('app-secret', body, sign('other'))).toBe(false);
    expect(validHubSignature('app-secret', Buffer.from('{"object":"page"}'), sign('app-secret'))).toBe(false);
    expect(validHubSignature('', body, sign(''))).toBe(false);
  });

  it('refuses a header in any other shape, or of another length', () => {
    expect(validHubSignature('app-secret', body, 'sha1=abc')).toBe(false);
    expect(validHubSignature('app-secret', body, '')).toBe(false);
    expect(validHubSignature('app-secret', body, 'sha256=short')).toBe(false);
  });
});
