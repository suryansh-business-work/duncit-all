import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath, redirectPathFromLocation } from '@duncit/shell';

describe('redirectPathFromLocation', () => {
  it('joins pathname + search + hash', () => {
    expect(
      redirectPathFromLocation({ pathname: '/venue-leads', search: '?tab=open', hash: '#row-3' })
    ).toBe('/venue-leads?tab=open#row-3');
  });

  it('handles empty search and hash gracefully', () => {
    expect(redirectPathFromLocation({ pathname: '/', search: '', hash: '' })).toBe('/');
  });
});

describe('getSafeRedirectPath', () => {
  it('returns the path when it starts with a single slash', () => {
    expect(getSafeRedirectPath('/venue-leads')).toBe('/venue-leads');
    expect(getSafeRedirectPath('/venue-leads?x=1')).toBe('/venue-leads?x=1');
  });

  it('rejects empty / nullish input', () => {
    expect(getSafeRedirectPath('')).toBe('');
    expect(getSafeRedirectPath(null)).toBe('');
    expect(getSafeRedirectPath(undefined)).toBe('');
  });

  it('rejects protocol-relative URLs', () => {
    expect(getSafeRedirectPath('//evil.com')).toBe('');
  });

  it('rejects non-root paths', () => {
    expect(getSafeRedirectPath('venue-leads')).toBe('');
    expect(getSafeRedirectPath('https://duncit.com/venue-leads')).toBe('');
  });

  it('rejects loops to /login', () => {
    expect(getSafeRedirectPath('/login')).toBe('');
    expect(getSafeRedirectPath('/login?denied=1')).toBe('');
  });
});
