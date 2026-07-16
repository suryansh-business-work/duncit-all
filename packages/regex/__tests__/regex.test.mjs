import { describe, expect, it } from 'vitest';
import {
  DIAL_CODE,
  DIGITS,
  EMAIL,
  isEmail,
  isOtp,
  isPhoneNumber,
  isPincode,
  OTP_6,
  PHONE_NUMBER,
  PHONE_NUMBER_IN,
  PINCODE,
} from '../regex.mjs';

describe('PHONE_NUMBER (bare 10 digits)', () => {
  it('accepts exactly ten digits', () => {
    expect(PHONE_NUMBER.test('1234567890')).toBe(true);
    expect(PHONE_NUMBER.test('0000000000')).toBe(true);
  });

  it('rejects wrong length or non-digits', () => {
    expect(PHONE_NUMBER.test('123456789')).toBe(false);
    expect(PHONE_NUMBER.test('12345678901')).toBe(false);
    expect(PHONE_NUMBER.test('123456789a')).toBe(false);
    expect(PHONE_NUMBER.test('')).toBe(false);
    expect(PHONE_NUMBER.test('12345 6789')).toBe(false);
  });
});

describe('PHONE_NUMBER_IN (Indian mobile 6-9)', () => {
  it('accepts a 10-digit number starting 6–9', () => {
    expect(PHONE_NUMBER_IN.test('9876543210')).toBe(true);
    expect(PHONE_NUMBER_IN.test('6000000000')).toBe(true);
  });

  it('rejects a leading digit below 6 or wrong length', () => {
    expect(PHONE_NUMBER_IN.test('5876543210')).toBe(false);
    expect(PHONE_NUMBER_IN.test('987654321')).toBe(false);
    expect(PHONE_NUMBER_IN.test('98765432101')).toBe(false);
  });
});

describe('DIAL_CODE', () => {
  it('accepts an optional + and 1–4 digits', () => {
    expect(DIAL_CODE.test('+91')).toBe(true);
    expect(DIAL_CODE.test('91')).toBe(true);
    expect(DIAL_CODE.test('1')).toBe(true);
    expect(DIAL_CODE.test('1234')).toBe(true);
  });

  it('rejects a bare +, too many digits, or junk', () => {
    expect(DIAL_CODE.test('+')).toBe(false);
    expect(DIAL_CODE.test('12345')).toBe(false);
    expect(DIAL_CODE.test('++91')).toBe(false);
    expect(DIAL_CODE.test('abc')).toBe(false);
  });
});

describe('PINCODE', () => {
  it('accepts a 6-digit code whose first digit is 1–9', () => {
    expect(PINCODE.test('110001')).toBe(true);
    expect(PINCODE.test('560103')).toBe(true);
  });

  it('rejects a leading zero, wrong length, or letters', () => {
    expect(PINCODE.test('011001')).toBe(false);
    expect(PINCODE.test('12345')).toBe(false);
    expect(PINCODE.test('1234567')).toBe(false);
    expect(PINCODE.test('abcdef')).toBe(false);
  });
});

describe('OTP_6', () => {
  it('accepts exactly six digits', () => {
    expect(OTP_6.test('123456')).toBe(true);
    expect(OTP_6.test('000000')).toBe(true);
  });

  it('rejects wrong length or non-digits', () => {
    expect(OTP_6.test('12345')).toBe(false);
    expect(OTP_6.test('1234567')).toBe(false);
    expect(OTP_6.test('12a456')).toBe(false);
  });
});

describe('DIGITS', () => {
  it('accepts one or more digits', () => {
    expect(DIGITS.test('0')).toBe(true);
    expect(DIGITS.test('1234567890123')).toBe(true);
  });

  it('rejects empty, decimals, or mixed content', () => {
    expect(DIGITS.test('')).toBe(false);
    expect(DIGITS.test('1.2')).toBe(false);
    expect(DIGITS.test('12a')).toBe(false);
  });
});

describe('EMAIL (hardened)', () => {
  it('accepts simple and multi-dot domains', () => {
    expect(EMAIL.test('a@b.com')).toBe(true);
    expect(EMAIL.test('john.doe@example.co.in')).toBe(true);
    expect(EMAIL.test('x+y@sub.domain.org')).toBe(true);
    expect(EMAIL.test('user_name@mail.server.io')).toBe(true);
  });

  it('rejects a domain with no dot', () => {
    expect(EMAIL.test('a@b')).toBe(false);
    expect(EMAIL.test('user@localhost')).toBe(false);
  });

  it('rejects empty/adjacent domain labels around dots', () => {
    expect(EMAIL.test('a@.com')).toBe(false);
    expect(EMAIL.test('a@b.')).toBe(false);
    expect(EMAIL.test('a@b..com')).toBe(false);
  });

  it('rejects leading/trailing junk and whitespace', () => {
    expect(EMAIL.test(' a@b.com')).toBe(false);
    expect(EMAIL.test('a@b.com ')).toBe(false);
    expect(EMAIL.test('a b@c.com')).toBe(false);
    expect(EMAIL.test('a@b c.com')).toBe(false);
  });

  it('rejects a missing local part, missing @, or a double @', () => {
    expect(EMAIL.test('@b.com')).toBe(false);
    expect(EMAIL.test('ab.com')).toBe(false);
    expect(EMAIL.test('a@@b.com')).toBe(false);
  });
});

describe('validators', () => {
  it('isPhoneNumber matches PHONE_NUMBER', () => {
    expect(isPhoneNumber('1234567890')).toBe(true);
    expect(isPhoneNumber('123')).toBe(false);
  });

  it('isPincode matches PINCODE', () => {
    expect(isPincode('110001')).toBe(true);
    expect(isPincode('011001')).toBe(false);
  });

  it('isEmail matches EMAIL', () => {
    expect(isEmail('a@b.com')).toBe(true);
    expect(isEmail('a@b')).toBe(false);
  });

  it('isOtp matches OTP_6', () => {
    expect(isOtp('123456')).toBe(true);
    expect(isOtp('12345')).toBe(false);
  });
});
