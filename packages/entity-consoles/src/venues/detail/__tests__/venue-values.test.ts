import { describe, expect, it } from 'vitest';
import {
  EMPTY,
  categoryPath,
  hasPayout,
  locationLine,
  orDash,
  streetAddress,
  weeklyOffNames,
} from '../venue-values';
import { makeVenue, missing } from './fixtures';

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

describe('venue-values / lines', () => {
  it('joins locality, city, state and country, skipping blank and missing parts', () => {
    expect(locationLine(makeVenue())).toBe('Indiranagar, Bengaluru, Karnataka, India');
    expect(locationLine(makeVenue({ locality: '  ', city: missing<string>(), state: 'Karnataka', country: '' }))).toBe(
      'Karnataka',
    );
  });

  it('reads an empty string when no location part is set', () => {
    expect(locationLine(makeVenue({ locality: '', city: '', state: '', country: '' }))).toBe('');
  });

  it('joins both street address lines, trimmed', () => {
    expect(streetAddress(makeVenue({ address_line1: ' 12 100 Feet Road ', address_line2: '' }))).toBe(
      '12 100 Feet Road',
    );
  });
});

describe('venue-values / categoryPath', () => {
  it('walks super category > category > sub category', () => {
    expect(categoryPath(makeVenue().venue_category)).toBe('For You > Games > Board Games');
  });

  it('reads the dash for a record filed under no category at all', () => {
    expect(categoryPath(missing<ReturnType<typeof makeVenue>['venue_category']>())).toBe(EMPTY);
  });
});

describe('venue-values / orDash', () => {
  it('dashes null, undefined and blank values', () => {
    expect(orDash(null)).toBe(EMPTY);
    expect(orDash(undefined)).toBe(EMPTY);
    expect(orDash('   ')).toBe(EMPTY);
  });

  it('keeps a real value, trimmed, including a zero', () => {
    expect(orDash(' 560038 ')).toBe('560038');
    expect(orDash(0)).toBe('0');
  });
});

describe('venue-values / weeklyOffNames', () => {
  it('names the closed days in week order without mutating the input', () => {
    const days = [6, 0, 3];
    expect(weeklyOffNames(days, WEEK)).toEqual(['Sunday', 'Wednesday', 'Saturday']);
    expect(days).toEqual([6, 0, 3]);
  });

  it('drops a day number that has no label', () => {
    expect(weeklyOffNames([1, 9], WEEK)).toEqual(['Monday']);
  });
});

describe('venue-values / hasPayout', () => {
  const bank = makeVenue().bank_account;

  it('is true when any one payout destination is set', () => {
    expect(hasPayout({ ...bank, account_number: '', upi_id: '', account_holder_name: 'Asha Rao' })).toBe(true);
    expect(hasPayout({ ...bank, account_number: '', account_holder_name: '' })).toBe(true);
    expect(hasPayout({ ...bank, upi_id: '', account_holder_name: '' })).toBe(true);
  });

  it('is false for an empty account and for no account', () => {
    expect(hasPayout({ ...bank, account_number: '', upi_id: '', account_holder_name: '' })).toBe(false);
    expect(hasPayout(missing<typeof bank>())).toBe(false);
  });
});
