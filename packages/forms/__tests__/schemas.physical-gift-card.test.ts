/**
 * Redeeming a printed gift card: the 9-digit number on its face and the
 * 16-digit passcode under its scratch panel. mWeb and the native app both build
 * this form from here, so a box that one surface accepts and the other refuses
 * — or a refusal one of them words and the other shows as raw server English —
 * cannot happen.
 */
import { describe, expect, it } from 'vitest';

import {
  buildPhysicalGiftCardInput,
  formatPhysicalGiftCardNumber,
  formatPhysicalGiftCardPasscode,
  makePhysicalGiftCardSchema,
  physicalGiftCardDefaults,
  physicalGiftCardErrorKey,
} from '../src/schemas';

/** Hands back the key, so a message failure names the key that was wrong. */
const t = (key: string) => key;

const schema = makePhysicalGiftCardSchema(t);

const issuesFor = (values: { card_number: string; passcode: string }) => {
  const result = schema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

const VALID = { card_number: '123456789', passcode: '1234-5678-9012-3456' };

describe('makePhysicalGiftCardSchema', () => {
  it('accepts a card number and the passcode as the box stores it, dashes and all', () => {
    expect(schema.safeParse(VALID).success).toBe(true);
    expect(schema.safeParse({ card_number: '123 456 789', passcode: '1234567890123456' }).success).toBe(true);
  });

  it('asks for both boxes when nothing has been typed — one line each, not two', () => {
    expect(issuesFor(physicalGiftCardDefaults)).toEqual([
      'card_number:mweb.giftCards.cardNumberRequired',
      'passcode:mweb.giftCards.passcodeRequired',
    ]);
  });

  it('treats a box holding only separators as empty, not as a wrong shape', () => {
    expect(issuesFor({ card_number: ' - ', passcode: '----' })).toEqual([
      'card_number:mweb.giftCards.cardNumberRequired',
      'passcode:mweb.giftCards.passcodeRequired',
    ]);
  });

  it('refuses a card number that is short, long or starts on 0', () => {
    for (const card_number of ['12345678', '1234567890', '012345678']) {
      expect(issuesFor({ ...VALID, card_number })).toEqual(['card_number:mweb.giftCards.cardNumberInvalid']);
    }
  });

  it('refuses a passcode one digit short or one over', () => {
    for (const passcode of ['1234-5678-9012-345', '1234-5678-9012-34567']) {
      expect(issuesFor({ ...VALID, passcode })).toEqual(['passcode:mweb.giftCards.passcodeInvalid']);
    }
  });
});

describe('formatPhysicalGiftCardNumber', () => {
  it('keeps only the digits, as typed or pasted', () => {
    expect(formatPhysicalGiftCardNumber('123 456-789')).toBe('123456789');
    expect(formatPhysicalGiftCardNumber('No. 12345')).toBe('12345');
    expect(formatPhysicalGiftCardNumber('')).toBe('');
  });

  it('stops at nine digits, so a paste with a trailing extra cannot overflow the box', () => {
    expect(formatPhysicalGiftCardNumber('1234567890')).toBe('123456789');
  });
});

describe('formatPhysicalGiftCardPasscode', () => {
  it('groups the digits in fours as they are typed', () => {
    expect(formatPhysicalGiftCardPasscode('')).toBe('');
    expect(formatPhysicalGiftCardPasscode('123')).toBe('123');
    expect(formatPhysicalGiftCardPasscode('1234')).toBe('1234');
    expect(formatPhysicalGiftCardPasscode('12345')).toBe('1234-5');
    expect(formatPhysicalGiftCardPasscode('1234567890123456')).toBe('1234-5678-9012-3456');
  });

  it('re-groups a pasted or spaced passcode and drops a deleted group’s dangling dash', () => {
    expect(formatPhysicalGiftCardPasscode('1234 5678 9012 3456')).toBe('1234-5678-9012-3456');
    expect(formatPhysicalGiftCardPasscode('12-345678')).toBe('1234-5678');
    expect(formatPhysicalGiftCardPasscode('1234-')).toBe('1234');
  });

  it('stops at sixteen digits and ignores letters', () => {
    expect(formatPhysicalGiftCardPasscode('12345678901234567890')).toBe('1234-5678-9012-3456');
    expect(formatPhysicalGiftCardPasscode('12ab34')).toBe('1234');
  });
});

describe('buildPhysicalGiftCardInput', () => {
  it('sends the digits only — the dashes are for the reader, not the server', () => {
    expect(buildPhysicalGiftCardInput({ card_number: '123 456 789', passcode: '1234-5678-9012-3456' })).toEqual({
      card_number: '123456789',
      passcode: '1234567890123456',
    });
  });
});

describe('physicalGiftCardErrorKey', () => {
  it('names every refusal the server sends with its own sentence', () => {
    expect(physicalGiftCardErrorKey('INVALID_FORMAT')).toBe('mweb.giftCards.physicalErrorInvalidFormat');
    expect(physicalGiftCardErrorKey('MISMATCH')).toBe('mweb.giftCards.physicalErrorMismatch');
    expect(physicalGiftCardErrorKey('LOCKED')).toBe('mweb.giftCards.physicalErrorLocked');
    expect(physicalGiftCardErrorKey('VOID')).toBe('mweb.giftCards.physicalErrorVoid');
    expect(physicalGiftCardErrorKey('OTHER_ACCOUNT')).toBe('mweb.giftCards.physicalErrorOtherAccount');
    expect(physicalGiftCardErrorKey('ALREADY_REDEEMED')).toBe('mweb.giftCards.physicalErrorAlreadyRedeemed');
    expect(physicalGiftCardErrorKey('EXPIRED')).toBe('mweb.giftCards.physicalErrorExpired');
  });

  it('falls back to the generic redeem line for a reason it does not know, or none at all', () => {
    for (const reason of ['SOMETHING_NEW', 'mismatch', 'toString', '', undefined, null, 42]) {
      expect(physicalGiftCardErrorKey(reason)).toBe('mweb.giftCards.redeemError');
    }
  });
});
