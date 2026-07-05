import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath, redirectPathFromLocation } from '../../src/utils/redirect';

describe('redirect helpers', () => {
  it('builds a path from a location', () => {
    expect(redirectPathFromLocation({ pathname: '/keys', search: '?q=1', hash: '#x' })).toBe('/keys?q=1#x');
  });

  it('only allows safe in-app redirect paths', () => {
    expect(getSafeRedirectPath('/keys')).toBe('/keys');
    expect(getSafeRedirectPath('//evil.com')).toBe('');
    expect(getSafeRedirectPath('/login?redirect=/x')).toBe('');
    expect(getSafeRedirectPath(null)).toBe('');
  });
});
