import { describe, expect, it } from 'vitest';
import {
  COUNTRY_OPTIONS,
  findCountryByName,
  getStatesForCountry,
  type GeoCountry,
  type GeoState,
} from '../src/index';

describe('COUNTRY_OPTIONS', () => {
  it('pins India first and lists every other country after it, alphabetically', () => {
    expect(COUNTRY_OPTIONS[0]).toMatchObject({ isoCode: 'IN', name: 'India' });
    const rest = COUNTRY_OPTIONS.slice(1);
    // India appears exactly once (not duplicated into the alphabetical tail).
    expect(rest.some((c) => c.isoCode === 'IN')).toBe(false);
    const names = rest.map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it('derives a two-letter regional-indicator emoji flag for each country', () => {
    const india = COUNTRY_OPTIONS[0] as GeoCountry;
    // 🇮🇳 = U+1F1EE U+1F1F3 (regional indicators I + N).
    expect(india.flag).toBe('\u{1F1EE}\u{1F1F3}');
    expect([...india.flag]).toHaveLength(2);
  });

  it('exposes a large real dataset (every country from country-region-data)', () => {
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(100);
    COUNTRY_OPTIONS.forEach((country) => {
      expect(country.isoCode).toMatch(/^[A-Z]{2}$/);
      expect(country.name).not.toHaveLength(0);
    });
  });
});

describe('getStatesForCountry', () => {
  it('returns the alphabetical state list for a known country', () => {
    const states: GeoState[] = getStatesForCountry('IN');
    expect(states.length).toBeGreaterThan(10);
    const names = states.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    states.forEach((state) => {
      expect(state.countryCode).toBe('IN');
      expect(state.isoCode).not.toHaveLength(0);
    });
  });

  it('returns an empty list for an unknown ISO code', () => {
    expect(getStatesForCountry('ZZ')).toEqual([]);
  });

  it('returns an empty list when no code is provided', () => {
    expect(getStatesForCountry()).toEqual([]);
    expect(getStatesForCountry(undefined)).toEqual([]);
  });
});

describe('findCountryByName', () => {
  it('looks a country up by its exact display name', () => {
    expect(findCountryByName('India')).toMatchObject({ isoCode: 'IN' });
    expect(findCountryByName('United States')?.isoCode).toBeDefined();
  });

  it('returns undefined for an unknown name', () => {
    expect(findCountryByName('Atlantis')).toBeUndefined();
  });

  it('returns undefined when no name is provided', () => {
    expect(findCountryByName()).toBeUndefined();
    expect(findCountryByName('')).toBeUndefined();
  });
});
