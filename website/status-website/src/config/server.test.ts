import { describe, expect, it } from 'vitest';
import { resolveMainSiteUrl, resolveServerBase } from './server';

describe('resolveServerBase', () => {
  it('prefers an explicit VITE_SERVER_URL', () => {
    expect(resolveServerBase({ VITE_SERVER_URL: 'https://staging.server.duncit.com', DEV: true })).toBe(
      'https://staging.server.duncit.com',
    );
  });

  it('falls back to localhost in dev', () => {
    expect(resolveServerBase({ DEV: true })).toBe('http://localhost:2001');
  });

  it('falls back to the production API otherwise', () => {
    expect(resolveServerBase({ DEV: false })).toBe('https://server.duncit.com');
    expect(resolveServerBase({})).toBe('https://server.duncit.com');
  });

  it('treats an empty VITE_SERVER_URL as unset', () => {
    expect(resolveServerBase({ VITE_SERVER_URL: '', DEV: false })).toBe('https://server.duncit.com');
  });
});

describe('resolveMainSiteUrl', () => {
  it('prefers an explicit VITE_MAIN_SITE_URL, then localhost in dev, then production', () => {
    expect(resolveMainSiteUrl({ VITE_MAIN_SITE_URL: 'https://staging.duncit.com' })).toBe(
      'https://staging.duncit.com',
    );
    expect(resolveMainSiteUrl({ DEV: true })).toBe('http://localhost:2000');
    expect(resolveMainSiteUrl({})).toBe('https://duncit.com');
  });
});
