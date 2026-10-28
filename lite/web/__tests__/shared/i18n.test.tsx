import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ALL_LITE_ENTRIES, PORTAL_FALLBACK, WEB_FALLBACK, usePortalT, useWebT } from '../../../shared/i18n';

describe('the local fallback catalogues', () => {
  it('give the web app its own copy plus the shared words, and none of the console copy', () => {
    expect(WEB_FALLBACK['lite.common.save']).toBe('Save');
    expect(WEB_FALLBACK['liteWeb.nav.discover']).toBe('Discover');
    expect(Object.keys(WEB_FALLBACK).some((key) => key.startsWith('litePortal.'))).toBe(false);
  });

  it('give the console its own copy plus the shared words, and none of the web copy', () => {
    expect(PORTAL_FALLBACK['lite.common.save']).toBe('Save');
    expect(Object.keys(PORTAL_FALLBACK).some((key) => key.startsWith('liteWeb.'))).toBe(false);
    expect(Object.keys(PORTAL_FALLBACK).length).toBeGreaterThan(Object.keys(WEB_FALLBACK).filter((key) => key.startsWith('lite.')).length);
  });

  it('list every shipped key exactly once for the console import, with its English value', () => {
    const entries = ALL_LITE_ENTRIES();
    const keys = entries.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(new Set([...Object.keys(WEB_FALLBACK), ...Object.keys(PORTAL_FALLBACK)]).size);
    expect(entries).toContainEqual({ key: 'liteWeb.nav.discover', value: 'Discover' });
    expect(entries).toContainEqual({ key: 'lite.common.save', value: 'Save' });
  });

  it('never ship a blank value', () => {
    expect(ALL_LITE_ENTRIES().filter((entry) => entry.value.trim() === '')).toEqual([]);
  });
});

describe('useWebT and usePortalT', () => {
  it('translate with the bundled English when no provider is mounted', () => {
    const { result } = renderHook(() => useWebT());
    expect(result.current.t('liteWeb.nav.discover')).toBe('Discover');
    expect(result.current.t('liteWeb.validation.atLeast', { vars: { min: 3 } })).toBe('Enter 3 or more');
  });

  it("give the console its own words, which the web app's hook does not know", () => {
    const portalKey = Object.keys(PORTAL_FALLBACK).find((key) => !key.startsWith('lite.'));
    expect(portalKey).toBeDefined();
    const key = portalKey ?? '';
    const portal = renderHook(() => usePortalT()).result.current;
    const web = renderHook(() => useWebT()).result.current;
    expect(portal.t(key)).toBe(PORTAL_FALLBACK[key]);
    expect(portal.t('lite.common.cancel')).toBe('Cancel');
    expect(web.t(key)).toBe(key);
  });
});
