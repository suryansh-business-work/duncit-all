import { describe, expect, it } from 'vitest';
import { APPS, PORTALS, WEBSITES, detectEnvironment } from '../src/config';

describe('config identifier lists', () => {
  it('exposes the app keys', () => {
    expect(APPS).toEqual(['server', 'mWeb', 'mobileApp']);
  });

  it('includes known portals and no duplicates', () => {
    expect(PORTALS).toContain('crm');
    expect(PORTALS).toContain('finance');
    expect(PORTALS).toContain('developers-portal');
    expect(new Set(PORTALS).size).toBe(PORTALS.length);
  });

  it('includes the marketing websites and no duplicates', () => {
    expect(WEBSITES).toEqual(['duncit', 'partners', 'ads', 'status', 'earnwith']);
    expect(new Set(WEBSITES).size).toBe(WEBSITES.length);
  });
});

describe('detectEnvironment', () => {
  it('classifies localhost-like hosts', () => {
    expect(detectEnvironment('')).toBe('localhost');
    expect(detectEnvironment(undefined)).toBe('localhost');
    expect(detectEnvironment(null)).toBe('localhost');
    expect(detectEnvironment('localhost')).toBe('localhost');
    expect(detectEnvironment('localhost:5173')).toBe('localhost');
    expect(detectEnvironment('127.0.0.1')).toBe('localhost');
    expect(detectEnvironment('::1')).toBe('localhost');
    expect(detectEnvironment('mac.local')).toBe('localhost');
  });

  it('classifies staging and production hosts', () => {
    expect(detectEnvironment('staging.crm.duncit.com')).toBe('staging');
    expect(detectEnvironment('crm.duncit.com')).toBe('production');
    expect(detectEnvironment('server.duncit.com')).toBe('production');
  });

  it('accepts a full URL and strips the scheme/port', () => {
    expect(detectEnvironment('https://staging.mweb.duncit.com/pods')).toBe('staging');
    expect(detectEnvironment('https://mweb.duncit.com:443/home')).toBe('production');
    expect(detectEnvironment('http://localhost:3000/x')).toBe('localhost');
  });

  it('falls back to the raw string when the URL is unparseable', () => {
    // Contains '://' so the URL branch runs, but is not a valid URL → catch path.
    expect(detectEnvironment('://not a url with staging in it')).toBe('staging');
  });
});
