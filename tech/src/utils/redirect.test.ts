import { describe, expect, it } from 'vitest';
import { redirectPathFromLocation, getSafeRedirectPath } from './redirect';

describe('redirect helpers', () => {
  it('builds a full path from a location', () => {
    expect(redirectPathFromLocation({ pathname: '/a', search: '?x=1', hash: '#h' })).toBe('/a?x=1#h');
  });

  it('accepts a safe in-app path', () => {
    expect(getSafeRedirectPath('/env')).toBe('/env');
  });

  it('rejects empty, external, protocol-relative and login paths', () => {
    expect(getSafeRedirectPath(null)).toBe('');
    expect(getSafeRedirectPath('')).toBe('');
    expect(getSafeRedirectPath('https://evil.com')).toBe('');
    expect(getSafeRedirectPath('//evil.com')).toBe('');
    expect(getSafeRedirectPath('/login')).toBe('');
    expect(getSafeRedirectPath('/login?next=/x')).toBe('');
  });
});
