import { describe, expect, it } from 'vitest';

import { getSafeRedirectPath, redirectPathFromLocation } from './redirect';

describe('redirect helpers', () => {
  it('joins pathname + search + hash', () => {
    expect(
      redirectPathFromLocation({ pathname: '/p', search: '?a=1', hash: '#h' }),
    ).toBe('/p?a=1#h');
  });

  it('rejects unsafe / empty redirect targets', () => {
    expect(getSafeRedirectPath(undefined)).toBe('');
    expect(getSafeRedirectPath('')).toBe('');
    expect(getSafeRedirectPath('https://evil.com')).toBe('');
    expect(getSafeRedirectPath('//evil.com')).toBe('');
    expect(getSafeRedirectPath('/login')).toBe('');
    expect(getSafeRedirectPath('/login?next=/x')).toBe('');
  });

  it('keeps a safe in-app path', () => {
    expect(getSafeRedirectPath('/dashboard?tab=1')).toBe('/dashboard?tab=1');
  });
});
