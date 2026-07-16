import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath, redirectPathFromLocation } from '@duncit/shell';

describe('redirect helpers', () => {
  it('builds a path from a location', () => {
    expect(redirectPathFromLocation({ pathname: '/challenges', search: '?q=1', hash: '#x' })).toBe('/challenges?q=1#x');
  });

  it('only allows safe in-app redirect paths', () => {
    expect(getSafeRedirectPath('/challenges')).toBe('/challenges');
    expect(getSafeRedirectPath('//evil.com')).toBe('');
    expect(getSafeRedirectPath('/login?redirect=/x')).toBe('');
    expect(getSafeRedirectPath(null)).toBe('');
  });
});
