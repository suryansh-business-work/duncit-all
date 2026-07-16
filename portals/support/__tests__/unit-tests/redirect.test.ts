import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath, redirectPathFromLocation } from '@duncit/shell';

describe('redirectPathFromLocation', () => {
  it('joins pathname, search and hash', () => {
    expect(
      redirectPathFromLocation({ pathname: '/tickets', search: '?status=OPEN', hash: '#top' })
    ).toBe('/tickets?status=OPEN#top');
  });

  it('handles empty search and hash', () => {
    expect(redirectPathFromLocation({ pathname: '/sos', search: '', hash: '' })).toBe('/sos');
  });
});

describe('getSafeRedirectPath', () => {
  it('rejects empty / nullish values', () => {
    expect(getSafeRedirectPath(undefined)).toBe('');
    expect(getSafeRedirectPath(null)).toBe('');
    expect(getSafeRedirectPath('')).toBe('');
  });

  it('rejects non-absolute and protocol-relative paths', () => {
    expect(getSafeRedirectPath('tickets')).toBe('');
    expect(getSafeRedirectPath('//evil.com')).toBe('');
  });

  it('rejects the login route to avoid redirect loops', () => {
    expect(getSafeRedirectPath('/login')).toBe('');
    expect(getSafeRedirectPath('/login?redirect=%2F')).toBe('');
  });

  it('accepts a safe in-app path', () => {
    expect(getSafeRedirectPath('/tickets/123')).toBe('/tickets/123');
  });
});
