import { describe, expect, it } from 'vitest';
import { cityValuesFrom, emptyCityValues, makeCitySchema, toCityInput, type CityFormValues } from '../../../../pages/cities/city';
import { CITY_REGIONS } from '../../../../pages/cities/city/city.types';
import { makeCity } from '../../../fixtures';
import { portalT } from '../../../test-utils';

const schema = makeCitySchema(portalT);
const VALID: CityFormValues = cityValuesFrom(makeCity());

const messageFor = <K extends keyof CityFormValues>(field: K, value: CityFormValues[K]): string | undefined =>
  schema.safeParse({ ...VALID, [field]: value }).error?.issues.find((issue) => issue.path[0] === field)?.message;

describe('CITY_REGIONS', () => {
  it('lists the five Explore tabs in display order', () => {
    expect(CITY_REGIONS).toEqual(['ASIA_PACIFIC', 'EUROPE', 'AFRICA', 'NORTH_AMERICA', 'SOUTH_AMERICA']);
  });
});

describe('city form values', () => {
  it('starts a new city active, unfeatured, in Asia & Pacific with sort order 0', () => {
    expect(emptyCityValues()).toEqual({ name: '', slug: '', country: '', region: 'ASIA_PACIFIC', cover_url: '', featured: false, sort_order: '0', is_active: true });
  });

  it('reads a stored city into text fields, an absent cover as blank', () => {
    expect(cityValuesFrom(makeCity({ region: 'EUROPE', cover_url: null, sort_order: 12 }))).toEqual({
      name: 'Bengaluru',
      slug: 'bengaluru',
      country: 'India',
      region: 'EUROPE',
      cover_url: '',
      featured: true,
      sort_order: '12',
      is_active: true,
    });
  });

  it('sends blanks as null so the server derives or clears them, and a blank sort order as 0', () => {
    expect(toCityInput({ ...emptyCityValues(), name: 'Pune', sort_order: '' })).toEqual({
      name: 'Pune',
      slug: null,
      country: null,
      region: 'ASIA_PACIFIC',
      cover_url: null,
      featured: false,
      sort_order: 0,
      is_active: true,
    });
  });

  it('sends a filled city as typed, with the sort order as a number', () => {
    expect(toCityInput(VALID)).toEqual({
      name: 'Bengaluru',
      slug: 'bengaluru',
      country: 'India',
      region: 'ASIA_PACIFIC',
      cover_url: 'https://img.example.com/blr.jpg',
      featured: true,
      sort_order: 3,
      is_active: true,
    });
  });
});

describe('makeCitySchema', () => {
  it('accepts a stored city', () => {
    expect(schema.safeParse(VALID).success).toBe(true);
  });

  it('requires a name of at most 60 characters', () => {
    expect(messageFor('name', '  ')).toBe('Name is required');
    expect(messageFor('name', 'n'.repeat(60))).toBeUndefined();
    expect(messageFor('name', 'n'.repeat(61))).toBe('Name must be 60 characters or fewer');
  });

  it('caps the slug at 80 and the country at 60 characters', () => {
    expect(messageFor('slug', '')).toBeUndefined();
    expect(messageFor('slug', 's'.repeat(81))).toBe('Slug must be 80 characters or fewer');
    expect(messageFor('country', 'c'.repeat(61))).toBe('Country must be 60 characters or fewer');
  });

  it('only takes one of the five regions', () => {
    for (const region of CITY_REGIONS) expect(messageFor('region', region)).toBeUndefined();
    const result = schema.safeParse({ ...VALID, region: 'ANTARCTICA' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['region']);
  });

  it('takes a blank or http(s) cover URL', () => {
    expect(messageFor('cover_url', '')).toBeUndefined();
    expect(messageFor('cover_url', 'http://img.example.com/a.png')).toBeUndefined();
    expect(messageFor('cover_url', 'ftp://img.example.com/a.png')).toBe('Cover picture must be a valid URL');
    expect(messageFor('cover_url', 'img.example.com/a.png')).toBe('Cover picture must be a valid URL');
  });

  it('takes a blank sort order or a whole number from 0 to 9999', () => {
    for (const good of ['', '0', '9999', ' 15 ']) expect(messageFor('sort_order', good), good).toBeUndefined();
    expect(messageFor('sort_order', '10000')).toBe('Sort order must be 9999 or less');
    expect(messageFor('sort_order', '-1')).toBe('Sort order cannot be negative');
    expect(messageFor('sort_order', '2.5')).toBe('Sort order must be a whole number');
  });
});
