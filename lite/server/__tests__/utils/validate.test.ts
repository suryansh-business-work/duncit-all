import { describe, expect, it } from 'vitest';
import {
  HANDLE,
  IANA_ZONE,
  OTP_6,
  cleanText,
  coordinate,
  isObjectId,
  normalizeEmail,
  normalizePhone,
  optionalUpi,
  optionalUrl,
  optionalWholeNumber,
  parseInstant,
  validTimezone,
  wholeNumber,
} from '../../utils/validate';
import { badInputError, thrownBy } from '../helpers/expect';

describe('wholeNumber', () => {
  const capacity = { min: 1, max: 500 };

  it('returns a whole number inside the range, both ends included', () => {
    expect(wholeNumber(1, 'Capacity', capacity)).toBe(1);
    expect(wholeNumber(250, 'Capacity', capacity)).toBe(250);
    expect(wholeNumber(500, 'Capacity', capacity)).toBe(500);
  });

  it('refuses anything that is not a whole number, naming the field', () => {
    for (const value of ['5', 2.5, Number.NaN, Number.POSITIVE_INFINITY, null, undefined, true]) {
      expect(thrownBy(() => wholeNumber(value, 'Capacity', capacity))).toMatchObject(badInputError('Capacity must be a whole number'));
    }
  });

  it('says "cannot be negative" when zero is the floor', () => {
    expect(thrownBy(() => wholeNumber(-1, 'Price', { min: 0, max: 100 }))).toMatchObject(badInputError('Price cannot be negative'));
    expect(wholeNumber(0, 'Price', { min: 0, max: 100 })).toBe(0);
  });

  it('names the minimum when the floor is above zero, even for a negative value', () => {
    expect(thrownBy(() => wholeNumber(0, 'Capacity', capacity))).toMatchObject(badInputError('Capacity must be at least 1'));
    expect(thrownBy(() => wholeNumber(-3, 'Capacity', capacity))).toMatchObject(badInputError('Capacity must be at least 1'));
  });

  it('names the maximum when the value is above it', () => {
    expect(thrownBy(() => wholeNumber(501, 'Capacity', capacity))).toMatchObject(badInputError('Capacity cannot be more than 500'));
  });
});

describe('optionalWholeNumber', () => {
  it('treats null and undefined as "no limit"', () => {
    expect(optionalWholeNumber(null, 'Seats', { min: 1, max: 10 })).toBeNull();
    expect(optionalWholeNumber(undefined, 'Seats', { min: 1, max: 10 })).toBeNull();
  });

  it('validates any other value like wholeNumber', () => {
    expect(optionalWholeNumber(4, 'Seats', { min: 1, max: 10 })).toBe(4);
    expect(thrownBy(() => optionalWholeNumber(0, 'Seats', { min: 1, max: 10 }))).toMatchObject(badInputError('Seats must be at least 1'));
  });
});

describe('normalizePhone', () => {
  it('adds the default country code to a national number', () => {
    expect(normalizePhone('98765 43210', '91')).toBe('+919876543210');
  });

  it('drops leading trunk zeros before adding the country code', () => {
    expect(normalizePhone('09876543210', '91')).toBe('+919876543210');
  });

  it('keeps the country code a number typed with + carries', () => {
    expect(normalizePhone('+1 (415) 555-2671', '91')).toBe('+14155552671');
    expect(normalizePhone(' +44 7911 123456 ', '91')).toBe('+447911123456');
  });

  it('uses the configured default country code', () => {
    expect(normalizePhone('7911 123456', '+44')).toBe('+447911123456');
  });

  it('refuses an Indian number that is not a 10-digit mobile', () => {
    expect(thrownBy(() => normalizePhone('5123456789', '91'))).toMatchObject(badInputError('Enter a valid Indian mobile number'));
    expect(thrownBy(() => normalizePhone('+91 98765 4321', '1'))).toMatchObject(badInputError('Enter a valid Indian mobile number'));
  });

  it('refuses numbers that are too short or too long', () => {
    expect(thrownBy(() => normalizePhone('+12345', '91'))).toMatchObject(badInputError('Enter a valid phone number'));
    expect(thrownBy(() => normalizePhone('+1234567', '91'))).toMatchObject(badInputError('Enter a valid phone number'));
    expect(thrownBy(() => normalizePhone('+1234567890123456', '91'))).toMatchObject(badInputError('Enter a valid phone number'));
  });

  it('refuses a value that is not a string', () => {
    expect(thrownBy(() => normalizePhone(9876543210, '91'))).toMatchObject(badInputError('Enter a valid phone number'));
    expect(thrownBy(() => normalizePhone(null, '91'))).toMatchObject(badInputError('Enter a valid phone number'));
  });
});

describe('coordinate', () => {
  it('accepts values inside the range, edges included', () => {
    expect(coordinate(19.076, 'Latitude')).toBe(19.076);
    expect(coordinate(-90, 'Latitude')).toBe(-90);
    expect(coordinate(180, 'Longitude')).toBe(180);
  });

  it('refuses values outside the range with the field and its bounds', () => {
    expect(thrownBy(() => coordinate(90.5, 'Latitude'))).toMatchObject(badInputError('Latitude must be between -90 and 90'));
    expect(thrownBy(() => coordinate(-180.1, 'Longitude'))).toMatchObject(badInputError('Longitude must be between -180 and 180'));
  });

  it('refuses non-numbers and non-finite numbers', () => {
    for (const value of ['19.07', Number.NaN, Number.POSITIVE_INFINITY, null]) {
      expect(thrownBy(() => coordinate(value, 'Latitude'))).toMatchObject(badInputError('Latitude must be between -90 and 90'));
    }
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases a valid address', () => {
    expect(normalizeEmail('  Priya.S@Example.COM ')).toBe('priya.s@example.com');
  });

  it('refuses malformed, missing and non-string values', () => {
    for (const value of ['priya', 'priya@example', 'priya @example.com', '', 42, null]) {
      expect(thrownBy(() => normalizeEmail(value))).toMatchObject(badInputError('Enter a valid email address'));
    }
  });

  it('refuses an address longer than 254 characters', () => {
    const long = `${'a'.repeat(250)}@x.com`;
    expect(thrownBy(() => normalizeEmail(long))).toMatchObject(badInputError('Enter a valid email address'));
  });
});

describe('cleanText', () => {
  it('trims and returns the text, or an empty string for a non-string', () => {
    expect(cleanText('  Terrace  ', 20, 'Venue')).toBe('Terrace');
    expect(cleanText(undefined, 20, 'Venue')).toBe('');
    expect(cleanText(12, 20, 'Venue')).toBe('');
  });

  it('refuses a blank required value', () => {
    expect(thrownBy(() => cleanText('   ', 20, 'Title', true))).toMatchObject(badInputError('Title is required'));
  });

  it('accepts exactly the maximum length and refuses one more', () => {
    expect(cleanText('x'.repeat(20), 20, 'Venue')).toHaveLength(20);
    expect(thrownBy(() => cleanText('x'.repeat(21), 20, 'Venue'))).toMatchObject(badInputError('Venue must be 20 characters or fewer'));
  });
});

describe('optionalUrl', () => {
  it('returns an empty string when nothing is given', () => {
    expect(optionalUrl('', 'Map link')).toBe('');
    expect(optionalUrl(null, 'Map link')).toBe('');
  });

  it('accepts http and https links', () => {
    expect(optionalUrl(' https://maps.app.goo.gl/abc ', 'Map link')).toBe('https://maps.app.goo.gl/abc');
    expect(optionalUrl('http://example.com/x', 'Map link')).toBe('http://example.com/x');
  });

  it('refuses other protocols and text that is not a link', () => {
    for (const value of ['ftp://files.example.com', 'javascript:alert(1)', 'maps.google.com']) {
      expect(thrownBy(() => optionalUrl(value, 'Map link'))).toMatchObject(badInputError('Map link must be a full http(s) link'));
    }
  });

  it('refuses a link longer than 2048 characters', () => {
    expect(thrownBy(() => optionalUrl(`https://x.com/${'a'.repeat(2048)}`, 'Map link'))).toMatchObject(
      badInputError('Map link must be 2048 characters or fewer'),
    );
  });
});

describe('optionalUpi', () => {
  it('lowercases a valid UPI ID and allows none', () => {
    expect(optionalUpi(' Priya.S@OKICICI ')).toBe('priya.s@okicici');
    expect(optionalUpi('')).toBe('');
    expect(optionalUpi(undefined)).toBe('');
  });

  it('refuses IDs that are not name@bank', () => {
    for (const value of ['priya', 'priya@', 'p@okaxis', 'priya@1bank', 'priya@ok axis']) {
      expect(thrownBy(() => optionalUpi(value))).toMatchObject(badInputError('Enter a valid UPI ID, like name@bank'));
    }
  });

  it('refuses an ID longer than 256 characters', () => {
    expect(thrownBy(() => optionalUpi(`${'a'.repeat(260)}@okaxis`))).toMatchObject(badInputError('UPI ID must be 256 characters or fewer'));
  });
});

describe('parseInstant', () => {
  it('parses an ISO string and copies a Date', () => {
    expect(parseInstant('2026-11-01T13:00:00.000Z', 'Start').toISOString()).toBe('2026-11-01T13:00:00.000Z');
    const date = new Date('2026-11-01T13:00:00.000Z');
    const parsed = parseInstant(date, 'Start');
    expect(parsed.getTime()).toBe(date.getTime());
    expect(parsed).not.toBe(date);
  });

  it('refuses text that is not a date, numbers and empty values', () => {
    for (const value of ['next friday', 1_793_538_000_000, null, undefined]) {
      expect(thrownBy(() => parseInstant(value, 'Start'))).toMatchObject(badInputError('Start is not a valid date and time'));
    }
  });
});

describe('validTimezone', () => {
  it('accepts IANA zones and UTC, trimmed', () => {
    expect(validTimezone(' Asia/Kolkata ')).toBe('Asia/Kolkata');
    expect(validTimezone('America/Argentina/Buenos_Aires')).toBe('America/Argentina/Buenos_Aires');
    expect(validTimezone('UTC')).toBe('UTC');
  });

  it('refuses abbreviations, blanks and zones the runtime does not know', () => {
    for (const value of ['IST', '', 'Mars/Olympus_Mons', 42]) {
      expect(thrownBy(() => validTimezone(value))).toMatchObject(badInputError('Pick a valid time zone'));
    }
  });
});

describe('isObjectId', () => {
  it('accepts 24 hex characters in either case', () => {
    expect(isObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isObjectId('507F1F77BCF86CD799439011')).toBe(true);
  });

  it('refuses anything else', () => {
    for (const value of ['507f1f77bcf86cd79943901', '507f1f77bcf86cd79943901z', '', 507, null]) expect(isObjectId(value)).toBe(false);
  });
});

describe('shared patterns', () => {
  it('HANDLE takes 3 to 30 lowercase letters, digits or inner underscores', () => {
    expect(HANDLE.test('priya_s')).toBe(true);
    expect(HANDLE.test('a'.repeat(30))).toBe(true);
    expect(HANDLE.test('a'.repeat(31))).toBe(false);
    expect(HANDLE.test('a')).toBe(false);
    expect(HANDLE.test('ab')).toBe(false);
    expect(HANDLE.test('_priya')).toBe(false);
    expect(HANDLE.test('priya_')).toBe(false);
    expect(HANDLE.test('Priya')).toBe(false);
  });

  it('OTP_6 is exactly six digits', () => {
    expect(OTP_6.test('012345')).toBe(true);
    expect(OTP_6.test('12345')).toBe(false);
    expect(OTP_6.test('1234567')).toBe(false);
    expect(OTP_6.test('12a456')).toBe(false);
  });

  it('IANA_ZONE matches Area/Location names and UTC only', () => {
    expect(IANA_ZONE.test('Europe/London')).toBe(true);
    expect(IANA_ZONE.test('UTC')).toBe(true);
    expect(IANA_ZONE.test('GMT')).toBe(false);
  });
});
