import { describe, it, expect } from 'vitest';
import { redirectPathFromLocation, getSafeRedirectPath } from '../src/lib/redirect';

describe('redirectPathFromLocation', () => {
  it('joins pathname + search + hash', () => {
    expect(redirectPathFromLocation({ pathname: '/a', search: '?x=1', hash: '#top' })).toBe('/a?x=1#top');
  });

  it('treats a missing hash as an empty string', () => {
    expect(redirectPathFromLocation({ pathname: '/a', search: '?x=1' })).toBe('/a?x=1');
  });
});

describe('getSafeRedirectPath', () => {
  it('returns empty for nullish/empty input', () => {
    expect(getSafeRedirectPath()).toBe('');
    expect(getSafeRedirectPath(null)).toBe('');
    expect(getSafeRedirectPath('')).toBe('');
  });

  it('rejects non-absolute and protocol-relative paths', () => {
    expect(getSafeRedirectPath('dashboard')).toBe('');
    expect(getSafeRedirectPath('https://evil.test')).toBe('');
    expect(getSafeRedirectPath('//evil.test')).toBe('');
  });

  it('rejects the auth pages', () => {
    expect(getSafeRedirectPath('/login')).toBe('');
    expect(getSafeRedirectPath('/login?redirect=/x')).toBe('');
    expect(getSafeRedirectPath('/register')).toBe('');
    expect(getSafeRedirectPath('/register?ref=abc')).toBe('');
  });

  it('accepts a safe same-origin path', () => {
    expect(getSafeRedirectPath('/dashboard?tab=1')).toBe('/dashboard?tab=1');
  });
});
