import { describe, expect, it } from 'vitest';

import {
  APP_HEADER,
  PLATFORM_HEADER,
  SURFACE_HEADER,
  clientIdentityHeaders,
  nativePlatformHeaders,
} from '../src/surface';

describe('nativePlatformHeaders', () => {
  it('names the store build the server reads as Android or iOS', () => {
    expect(nativePlatformHeaders('android')).toEqual({ 'x-duncit-platform': 'ANDROID' });
    expect(nativePlatformHeaders('ios')).toEqual({ [PLATFORM_HEADER]: 'IOS' });
  });

  it('sends nothing from the web build, so a browser preflight never meets the header', () => {
    expect(nativePlatformHeaders('web')).toEqual({});
    expect(nativePlatformHeaders('windows')).toEqual({});
    expect(nativePlatformHeaders('')).toEqual({});
  });
});

describe('clientIdentityHeaders', () => {
  it('names the surface and the app in the two headers nginx allowlists', () => {
    expect(clientIdentityHeaders('MWEB', 'mweb')).toEqual({
      [SURFACE_HEADER]: 'MWEB',
      [APP_HEADER]: 'mweb',
    });
  });

  it('sends only the surface when the caller cannot name an app — never a fabricated key', () => {
    expect(clientIdentityHeaders('WEBSITE', '')).toEqual({ [SURFACE_HEADER]: 'WEBSITE' });
    expect(clientIdentityHeaders('WEBSITE', '')).not.toHaveProperty(APP_HEADER);
  });

  it('treats a whitespace-only app key as no key at all', () => {
    expect(clientIdentityHeaders('NATIVE', '   ')).toEqual({ [SURFACE_HEADER]: 'NATIVE' });
  });

  it('trims the app key so a padded portal name still matches its rate-limiter row', () => {
    expect(clientIdentityHeaders('PORTAL', '  finance  ')).toEqual({
      [SURFACE_HEADER]: 'PORTAL',
      [APP_HEADER]: 'finance',
    });
  });

  it('carries the exact header names every transport already sends', () => {
    const headers = clientIdentityHeaders('ADMIN_PORTAL', 'admin');

    expect(headers['x-duncit-surface']).toBe('ADMIN_PORTAL');
    expect(headers['x-duncit-app']).toBe('admin');
  });
});
