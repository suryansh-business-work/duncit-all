import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath, redirectPathFromLocation } from './redirect';

describe('redirectPathFromLocation', () => {
  it('joins pathname, search and hash', () => {
    expect(
      redirectPathFromLocation({ pathname: '/venues', search: '?page=2', hash: '#top' }),
    ).toBe('/venues?page=2#top');
  });
});

describe('getSafeRedirectPath', () => {
  it('returns an internal path unchanged', () => {
    expect(getSafeRedirectPath('/hosts')).toBe('/hosts');
  });

  it('rejects empty, external and protocol-relative values', () => {
    expect(getSafeRedirectPath('')).toBe('');
    expect(getSafeRedirectPath(null)).toBe('');
    expect(getSafeRedirectPath(undefined)).toBe('');
    expect(getSafeRedirectPath('https://evil.com')).toBe('');
    expect(getSafeRedirectPath('//evil.com')).toBe('');
  });

  it('rejects the login route to avoid redirect loops', () => {
    expect(getSafeRedirectPath('/login')).toBe('');
    expect(getSafeRedirectPath('/login?redirect=%2Fhosts')).toBe('');
  });
});
