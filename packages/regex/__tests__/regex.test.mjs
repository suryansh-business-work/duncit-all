import { describe, expect, it } from 'vitest';
import {
  BANK_ACCOUNT_NUMBER,
  DIAL_CODE,
  DIGITS,
  EMAIL,
  GSTIN,
  IFSC,
  isBankAccountNumber,
  isEmail,
  isGstin,
  isIfsc,
  isPersonName,
  isOtp,
  isPhoneIntl,
  isPhoneNumber,
  isPincode,
  isPincodeLoose,
  isUpiId,
  OTP_6,
  PERSON_NAME,
  PHONE_INTL,
  PHONE_INTL_PLUS,
  PHONE_NUMBER,
  PHONE_NUMBER_IN,
  PINCODE,
  PINCODE_LOOSE,
  UPI_ID,
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

describe('PHONE_INTL (6–15 digits, no dial code)', () => {
  it('accepts the shortest and longest allowed lengths', () => {
    expect(PHONE_INTL.test('123456')).toBe(true);
    expect(PHONE_INTL.test('123456789012345')).toBe(true);
  });

  it('rejects too short, too long, a `+`, or separators', () => {
    expect(PHONE_INTL.test('12345')).toBe(false);
    expect(PHONE_INTL.test('1234567890123456')).toBe(false);
    expect(PHONE_INTL.test('+919876543210')).toBe(false);
    expect(PHONE_INTL.test('98765 43210')).toBe(false);
  });

  it('still accepts an Indian mobile, so checkout keeps working', () => {
    expect(PHONE_INTL.test('9876543210')).toBe(true);
  });
});

describe('PHONE_INTL_PLUS', () => {
  it('accepts the same numbers with or without a leading +', () => {
    expect(PHONE_INTL_PLUS.test('+919876543210')).toBe(true);
    expect(PHONE_INTL_PLUS.test('919876543210')).toBe(true);
  });

  it('rejects a bare +, a trailing +, or a double +', () => {
    expect(PHONE_INTL_PLUS.test('+')).toBe(false);
    expect(PHONE_INTL_PLUS.test('919876543210+')).toBe(false);
    expect(PHONE_INTL_PLUS.test('++919876543210')).toBe(false);
  });
});

describe('PINCODE_LOOSE (4–10 digits)', () => {
  it('accepts non-Indian postal codes and a leading zero', () => {
    expect(PINCODE_LOOSE.test('1234')).toBe(true);
    expect(PINCODE_LOOSE.test('0123456789')).toBe(true);
  });

  it('rejects too short, too long, or alphanumeric codes', () => {
    expect(PINCODE_LOOSE.test('123')).toBe(false);
    expect(PINCODE_LOOSE.test('01234567891')).toBe(false);
    expect(PINCODE_LOOSE.test('SW1A1AA')).toBe(false);
  });

  it('is strictly looser than the Indian PINCODE it must not replace', () => {
    expect(PINCODE.test('012345')).toBe(false);
    expect(PINCODE_LOOSE.test('012345')).toBe(true);
  });
});

describe('IFSC', () => {
  it('accepts 4 letters, a literal 0, then 6 alphanumerics', () => {
    expect(IFSC.test('HDFC0001234')).toBe(true);
    expect(IFSC.test('SBIN0ABCDEF')).toBe(true);
  });

  it('rejects a lowercase bank code, a non-zero 5th char, or wrong length', () => {
    expect(IFSC.test('hdfc0001234')).toBe(false);
    expect(IFSC.test('HDFC1001234')).toBe(false);
    expect(IFSC.test('HDFC000123')).toBe(false);
    expect(IFSC.test('HDFC00012345')).toBe(false);
  });
});

describe('UPI_ID', () => {
  it('accepts a normal VPA and one with dots, dashes and underscores', () => {
    expect(UPI_ID.test('john@okhdfcbank')).toBe(true);
    expect(UPI_ID.test('john.doe_1-2@ok.axis')).toBe(true);
  });

  it('rejects a missing handle, a numeric-leading handle, or a too-short side', () => {
    expect(UPI_ID.test('john@')).toBe(false);
    expect(UPI_ID.test('john@1bank')).toBe(false);
    expect(UPI_ID.test('j@okhdfcbank')).toBe(false);
    expect(UPI_ID.test('john@ok')).toBe(false);
  });
});

describe('BANK_ACCOUNT_NUMBER', () => {
  it('accepts 6–18 digits', () => {
    expect(BANK_ACCOUNT_NUMBER.test('123456')).toBe(true);
    expect(BANK_ACCOUNT_NUMBER.test('123456789012345678')).toBe(true);
  });

  it('rejects too short, too long, or non-digits', () => {
    expect(BANK_ACCOUNT_NUMBER.test('12345')).toBe(false);
    expect(BANK_ACCOUNT_NUMBER.test('1234567890123456789')).toBe(false);
    expect(BANK_ACCOUNT_NUMBER.test('1234-5678')).toBe(false);
  });
});

describe('GSTIN', () => {
  it('accepts a real 15-character GSTIN', () => {
    expect(GSTIN.test('29ABCDE1234F1Z5')).toBe(true);
    expect(GSTIN.test('07AAACS1234K1ZW')).toBe(true);
  });

  it('requires the literal Z in position 14', () => {
    expect(GSTIN.test('29ABCDE1234F1A5')).toBe(false);
  });

  it('rejects lowercase, a non-digit state code, or the wrong length', () => {
    expect(GSTIN.test('29abcde1234f1z5')).toBe(false);
    expect(GSTIN.test('2AABCDE1234F1Z5')).toBe(false);
    expect(GSTIN.test('29ABCDE1234F1Z')).toBe(false);
    expect(GSTIN.test('29ABCDE1234F1Z55')).toBe(false);
  });

  it("rejects what mWeb checkout's 14-character pattern accepts — the live defect", () => {
    const mwebCheckoutPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z][\dA-Z]{2}$/;
    const fourteenChars = '29ABCDE1234F1Z';
    expect(fourteenChars).toHaveLength(14);
    expect(mwebCheckoutPattern.test(fourteenChars)).toBe(true);
    expect(GSTIN.test(fourteenChars)).toBe(false);
    // ...and the converse: checkout rejects every genuine GSTIN.
    expect(mwebCheckoutPattern.test('29ABCDE1234F1Z5')).toBe(false);
  });
});

describe('PERSON_NAME', () => {
  it.each(["Jane Doe", "O'Brien", 'O’Brien', 'Anne Marie St. John', 'Rao'])(
    'accepts the human name %s',
    (name) => {
      expect(PERSON_NAME.test(name)).toBe(true);
    },
  );

  it.each(['Doe123', 'Doe_1', 'Doe 😀', 'Doe@', 'Doe-Smith', '  Doe', '1Doe', ''])(
    'rejects %s',
    (name) => {
      expect(PERSON_NAME.test(name)).toBe(false);
    },
  );

  it('rejects a name longer than 80 characters', () => {
    expect(PERSON_NAME.test('A'.repeat(80))).toBe(true);
    expect(PERSON_NAME.test('A'.repeat(81))).toBe(false);
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

  it('isPhoneIntl matches PHONE_INTL', () => {
    expect(isPhoneIntl('123456')).toBe(true);
    expect(isPhoneIntl('12345')).toBe(false);
  });

  it('isPincodeLoose matches PINCODE_LOOSE', () => {
    expect(isPincodeLoose('0123')).toBe(true);
    expect(isPincodeLoose('123')).toBe(false);
  });

  it('isIfsc matches IFSC', () => {
    expect(isIfsc('HDFC0001234')).toBe(true);
    expect(isIfsc('HDFC1001234')).toBe(false);
  });

  it('isUpiId matches UPI_ID', () => {
    expect(isUpiId('john@okhdfcbank')).toBe(true);
    expect(isUpiId('john@')).toBe(false);
  });

  it('isBankAccountNumber matches BANK_ACCOUNT_NUMBER', () => {
    expect(isBankAccountNumber('123456')).toBe(true);
    expect(isBankAccountNumber('12345')).toBe(false);
  });

  it('isPersonName matches PERSON_NAME', () => {
    expect(isPersonName('Jane Doe')).toBe(true);
    expect(isPersonName('Jane Doe 2')).toBe(false);
  });

  it('isGstin uses the STRICT pattern, not the loose one', () => {
    expect(isGstin('29ABCDE1234F1Z5')).toBe(true);
    expect(isGstin('29ABCDE1234F1A5')).toBe(false);
  });
});
