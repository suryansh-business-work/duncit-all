import { describe, expect, it } from 'vitest';
import { nationalPhoneDigits } from '../src/phone';

// The meeting flow stores "+91 9876543210"; every surface that shows a bare
// local number reads it through this.
describe('nationalPhoneDigits', () => {
  it('strips a spaced country code down to the local 10 digits', () => {
    expect(nationalPhoneDigits('+91 9876543210')).toBe('9876543210');
    expect(nationalPhoneDigits('+919876543210')).toBe('9876543210');
  });

  it('passes a bare 10-digit number through unchanged', () => {
    expect(nationalPhoneDigits('9876543210')).toBe('9876543210');
  });

  it('drops every non-digit before slicing', () => {
    expect(nationalPhoneDigits('(+91) 98765-43210')).toBe('9876543210');
  });

  it('returns everything it has when shorter than the requested length', () => {
    expect(nationalPhoneDigits('12345')).toBe('12345');
    expect(nationalPhoneDigits('')).toBe('');
    expect(nationalPhoneDigits(null)).toBe('');
    expect(nationalPhoneDigits(undefined)).toBe('');
  });

  it('honours a custom length', () => {
    expect(nationalPhoneDigits('+1 415 555 0100', 7)).toBe('5550100');
  });
});
