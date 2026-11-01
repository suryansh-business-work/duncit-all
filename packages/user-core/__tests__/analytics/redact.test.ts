import { describe, expect, it } from 'vitest';
import { REDACTED_EMAIL, REDACTED_NUMBER, redactText } from '../../src/analytics/redact';

describe('redactText', () => {
  it('masks every token holding an @ as an email', () => {
    expect(redactText('mail me at a.b@duncit.com please')).toBe(`mail me at ${REDACTED_EMAIL} please`);
  });

  it('masks runs of four or more digits — phones, OTPs, accounts — and keeps shorter ones', () => {
    expect(redactText('OTP 482913 for +919876543210')).toBe(`OTP ${REDACTED_NUMBER} for +${REDACTED_NUMBER}`);
    expect(redactText('Join 3 pods at 7pm')).toBe('Join 3 pods at 7pm');
    expect(redactText('code AB1234CD')).toBe(`code AB${REDACTED_NUMBER}CD`);
  });

  it('masks a phone number split by spaces, group by group', () => {
    expect(redactText('98765 43210')).toBe(`${REDACTED_NUMBER} ${REDACTED_NUMBER}`);
  });

  it('collapses whitespace and caps the length', () => {
    expect(redactText('  Create   pod \n now ')).toBe('Create pod now');
    expect(redactText('abcdefghij', 4)).toBe('abcd');
  });

  it('answers an empty string for nothing', () => {
    expect(redactText(undefined)).toBe('');
    expect(redactText(null)).toBe('');
    expect(redactText('')).toBe('');
  });
});
