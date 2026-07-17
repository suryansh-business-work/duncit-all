import { describe, expect, it } from 'vitest';
import { adRequestSchema } from '../../src/pages/create-ad-page/ad-request/ad-request.types';
import { makeAdRequestFormValues } from '../mocks';

const valid = makeAdRequestFormValues();

describe('ad-request.types edge branches', () => {
  it('rejects a redirect URL the URL constructor cannot parse (catch branch)', () => {
    const result = adRequestSchema.safeParse({ ...valid, redirect_url: 'not-a-valid-url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /redirect url/i.test(i.message))).toBe(true);
    }
  });

  it('defaults a missing redirect URL to an empty string', () => {
    const withoutRedirect: Record<string, unknown> = { ...valid };
    delete withoutRedirect.redirect_url;
    const parsed = adRequestSchema.parse(withoutRedirect);
    expect(parsed.redirect_url).toBe('');
  });
});
