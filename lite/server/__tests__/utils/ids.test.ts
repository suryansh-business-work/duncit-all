import { describe, expect, it } from 'vitest';
import { checkInCode, iso, oneTimeCode, sha256 } from '../../utils/ids';

describe('checkInCode', () => {
  it('is six characters from the door-safe alphabet by default (no 0, O, 1 or I)', () => {
    const codes = Array.from({ length: 300 }, () => checkInCode());
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('honours a custom length', () => {
    expect(checkInCode(10)).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
  });

  it('does not repeat itself across many draws', () => {
    const codes = new Set(Array.from({ length: 200 }, () => checkInCode()));
    expect(codes.size).toBeGreaterThan(195);
  });
});

describe('oneTimeCode', () => {
  it('is always six digits, zero-padded', () => {
    for (let i = 0; i < 500; i += 1) expect(oneTimeCode()).toMatch(/^\d{6}$/);
  });
});

describe('sha256', () => {
  it('is the hex SHA-256 digest', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('123456')).not.toBe(sha256('123457'));
  });
});

describe('iso', () => {
  it('formats a Date and answers null for anything else', () => {
    expect(iso(new Date('2026-11-01T13:00:00.000Z'))).toBe('2026-11-01T13:00:00.000Z');
    expect(iso('2026-11-01T13:00:00.000Z')).toBeNull();
    expect(iso(null)).toBeNull();
    expect(iso(undefined)).toBeNull();
  });
});
