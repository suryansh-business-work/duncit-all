import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/lib/slug';

describe('slugify', () => {
  it('lowercases and dasherises a title', () => {
    expect(slugify('Privacy Policy')).toBe('privacy-policy');
  });

  it('collapses non-alphanumerics and trims dashes', () => {
    expect(slugify('  Terms & Conditions!! ')).toBe('terms-conditions');
  });

  it('returns an empty string for empty / symbol-only input', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
    expect(slugify('!!!')).toBe('');
  });
});
