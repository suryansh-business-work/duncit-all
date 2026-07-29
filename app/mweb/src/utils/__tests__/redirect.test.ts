import { describe, expect, it } from 'vitest';

import { getSafeRedirectPath, postAuthPath, redirectPathFromLocation } from '../redirect';

describe('getSafeRedirectPath', () => {
  it('keeps an in-app path', () => {
    expect(getSafeRedirectPath('/booking/abc')).toBe('/booking/abc');
  });

  it('rejects off-site, protocol-relative and empty targets', () => {
    expect(getSafeRedirectPath('https://evil.test/x')).toBe('');
    expect(getSafeRedirectPath('//evil.test')).toBe('');
    expect(getSafeRedirectPath('')).toBe('');
    expect(getSafeRedirectPath(null)).toBe('');
    expect(getSafeRedirectPath(undefined)).toBe('');
  });

  it('never bounces back into the auth pages', () => {
    expect(getSafeRedirectPath('/login')).toBe('');
    expect(getSafeRedirectPath('/login?redirect=/x')).toBe('');
    expect(getSafeRedirectPath('/register')).toBe('');
    expect(getSafeRedirectPath('/register?x=1')).toBe('');
  });
});

describe('redirectPathFromLocation', () => {
  it('rebuilds the full path including search and hash', () => {
    expect(
      redirectPathFromLocation({ pathname: '/pod/a', search: '?q=1', hash: '#top' }),
    ).toBe('/pod/a?q=1#top');
  });
});

describe('postAuthPath', () => {
  it('goes straight to the deep link once the survey is done', () => {
    expect(postAuthPath(true, '/booking/abc')).toBe('/booking/abc');
  });

  it('falls back home when there is nothing to resume', () => {
    expect(postAuthPath(true, '')).toBe('/');
    expect(postAuthPath(true, null)).toBe('/');
    expect(postAuthPath(false, '')).toBe('/signup-survey');
  });

  // The bug: the survey gate used to swallow the deep link, so an emailed
  // booking link landed on the home page for anyone mid-onboarding. Native
  // parks and replays the same link (rule 27).
  it('carries the deep link across the survey gate', () => {
    expect(postAuthPath(false, '/booking/abc')).toBe(
      '/signup-survey?redirect=%2Fbooking%2Fabc',
    );
  });

  it('will not carry an unsafe target across the gate either', () => {
    expect(postAuthPath(false, 'https://evil.test/x')).toBe('/signup-survey');
  });
});
