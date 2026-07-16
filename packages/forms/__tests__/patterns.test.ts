import { describe, it, expect } from 'vitest';
import {
  PERSON_NAME_PATTERN,
  PHONE_NUMBER_PATTERN,
  PHONE_EXTENSION_PATTERN,
  SLUG_KEY_PATTERN,
  PAN_PATTERN,
  AADHAR_PATTERN,
  GSTIN_PATTERN,
  OTP_PATTERN,
  POSTAL_CODE_PATTERN,
} from '../src/patterns';

describe('validation patterns', () => {
  it('PERSON_NAME_PATTERN accepts letters/spaces/apostrophes and rejects leading digits', () => {
    expect(PERSON_NAME_PATTERN.test("O'Brien-Smith Jr.")).toBe(true);
    expect(PERSON_NAME_PATTERN.test('1abc')).toBe(false);
  });

  it('PHONE_NUMBER_PATTERN accepts 6-15 digits and rejects short/letter input', () => {
    expect(PHONE_NUMBER_PATTERN.test('9876543210')).toBe(true);
    expect(PHONE_NUMBER_PATTERN.test('12345')).toBe(false);
    expect(PHONE_NUMBER_PATTERN.test('12a456')).toBe(false);
  });

  it('PHONE_EXTENSION_PATTERN accepts an optional + and 1-5 digits', () => {
    expect(PHONE_EXTENSION_PATTERN.test('+91')).toBe(true);
    expect(PHONE_EXTENSION_PATTERN.test('123456')).toBe(false);
  });

  it('SLUG_KEY_PATTERN accepts lowercase slug keys', () => {
    expect(SLUG_KEY_PATTERN.test('pod-profit_v2')).toBe(true);
    expect(SLUG_KEY_PATTERN.test('Pod Profit')).toBe(false);
  });

  it('PAN_PATTERN matches an Indian PAN', () => {
    expect(PAN_PATTERN.test('ABCDE1234F')).toBe(true);
    expect(PAN_PATTERN.test('ABCDE1234')).toBe(false);
  });

  it('AADHAR_PATTERN matches exactly 12 digits', () => {
    expect(AADHAR_PATTERN.test('123456789012')).toBe(true);
    expect(AADHAR_PATTERN.test('12345678901')).toBe(false);
  });

  it('GSTIN_PATTERN matches a GSTIN', () => {
    expect(GSTIN_PATTERN.test('22ABCDE1234F1Z5')).toBe(true);
    expect(GSTIN_PATTERN.test('22ABCDE1234F1A5')).toBe(false);
  });

  it('OTP_PATTERN matches 4-8 digits', () => {
    expect(OTP_PATTERN.test('1234')).toBe(true);
    expect(OTP_PATTERN.test('123')).toBe(false);
  });

  it('POSTAL_CODE_PATTERN matches alphanumeric postal codes', () => {
    expect(POSTAL_CODE_PATTERN.test('411001')).toBe(true);
    expect(POSTAL_CODE_PATTERN.test('SW1A 1AA')).toBe(true);
    expect(POSTAL_CODE_PATTERN.test('!!')).toBe(false);
  });
});
