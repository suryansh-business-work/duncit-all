import { describe, expect, it } from 'vitest';
import {
  FALLBACK_ICON_NAMES,
  resolveIconSource,
  toFallbackIconName,
  type FallbackIconManifest,
} from '../src/contract';

describe('FALLBACK_ICON_NAMES', () => {
  it('is a non-empty set of unique names', () => {
    expect(FALLBACK_ICON_NAMES.length).toBeGreaterThan(0);
    expect(new Set(FALLBACK_ICON_NAMES).size).toBe(FALLBACK_ICON_NAMES.length);
  });

  it('types a manifest so a missing name is a compile error', () => {
    // A complete manifest satisfies the contract; an incomplete one would not
    // typecheck, which is the build gate every project relies on.
    const manifest: FallbackIconManifest<string> = {
      logo: 'logo.svg',
      favicon: 'favicon.png',
      splash: 'splash.png',
      'all-vibe': 'all-vibe.svg',
      placeholder: 'placeholder.svg',
      occasion: 'occasion.svg',
    };
    for (const name of FALLBACK_ICON_NAMES) {
      expect(manifest[name]).toBeTruthy();
    }
  });
});

describe('toFallbackIconName', () => {
  it('accepts known names and rejects everything else', () => {
    expect(toFallbackIconName('logo')).toBe('logo');
    expect(toFallbackIconName('all-vibe')).toBe('all-vibe');
    expect(toFallbackIconName('nope')).toBeNull();
    expect(toFallbackIconName('')).toBeNull();
    expect(toFallbackIconName(null)).toBeNull();
    expect(toFallbackIconName(undefined)).toBeNull();
  });
});

describe('resolveIconSource', () => {
  it('uses the admin URL when it is usable', () => {
    expect(resolveIconSource('https://cdn/logo.png', 'BUNDLED')).toEqual({
      source: 'https://cdn/logo.png',
      isFallback: false,
    });
    // Surrounding whitespace is trimmed rather than treated as a URL.
    expect(resolveIconSource('  https://cdn/logo.png  ', 'BUNDLED').source).toBe(
      'https://cdn/logo.png',
    );
  });

  it('falls back when the URL is missing, blank or whitespace', () => {
    for (const url of [null, undefined, '', '   ']) {
      expect(resolveIconSource(url, 'BUNDLED')).toEqual({ source: 'BUNDLED', isFallback: true });
    }
  });

  it('falls back once a URL has been reported as failed', () => {
    expect(resolveIconSource('https://cdn/dead.png', 'BUNDLED', true)).toEqual({
      source: 'BUNDLED',
      isFallback: true,
    });
  });
});
