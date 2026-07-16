import { afterEach, describe, expect, it, vi } from 'vitest';
import { PORTALS, PORTAL_CATEGORIES, resolvePortalUrl } from '../src/login-screen/portals';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('portals registry', () => {
  it('exposes every console with a unique key', () => {
    const keys = PORTALS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(PORTALS.length).toBeGreaterThan(10);
  });

  it('every portal image url is derived from the Pexels helper', () => {
    for (const p of PORTALS) {
      expect(p.image).toContain('images.pexels.com/photos/');
    }
  });

  it('categorises portals within the known category set', () => {
    for (const p of PORTALS) {
      expect(PORTAL_CATEGORIES).toContain(p.category);
    }
  });
});

describe('resolvePortalUrl', () => {
  const entry = PORTALS[0];

  it('returns a localhost dev url when on localhost', () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    expect(resolvePortalUrl(entry)).toBe(`http://localhost:${entry.port}/`);
  });

  it('returns a localhost dev url when on 127.0.0.1', () => {
    vi.stubGlobal('window', { location: { hostname: '127.0.0.1' } });
    expect(resolvePortalUrl(entry)).toBe(`http://localhost:${entry.port}/`);
  });

  it('returns the production subdomain url otherwise', () => {
    vi.stubGlobal('window', { location: { hostname: 'admin.duncit.com' } });
    expect(resolvePortalUrl(entry)).toBe(`https://${entry.subdomain}.duncit.com/`);
  });

  it('returns the production url when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined);
    expect(resolvePortalUrl(entry)).toBe(`https://${entry.subdomain}.duncit.com/`);
  });
});
