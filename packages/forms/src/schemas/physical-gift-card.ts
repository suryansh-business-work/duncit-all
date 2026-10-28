import { z } from 'zod';
import { isPhysicalGiftCardNumber, isPhysicalGiftCardPasscode, toDigits } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * Redeeming a PRINTED gift card — the second door on the Redeem screen beside
 * the emailed code. The card carries a 9-digit number in the open and a
 * 16-digit passcode under its scratch panel; both are typed in, and the redeem
 * mutation is the only call (there is no lookup for a printed card).
 *
 * mWeb (MUI) and the native app (Tamagui) render this form separately, but
 * everything below the UI is one copy (rules 27 and 40): the rules, the way the
 * boxes mask what is typed, what is sent, and the sentence for each refusal.
 */

/** How many digits a card number has, and a passcode, and a passcode group. */
const CARD_NUMBER_DIGITS = 9;
const PASSCODE_DIGITS = 16;
const PASSCODE_GROUP = 4;

/**
 * One box's rule: blank (or nothing but separators) asks for the value, any
 * other shape the validator refuses says it is not the right shape. One issue
 * per box, so the line under it never stacks two messages.
 */
const digitsRule = (isValid: (value: string) => boolean, requiredMessage: string, invalidMessage: string) =>
  z.string().superRefine((value, ctx) => {
    if (isValid(value)) return;
    ctx.addIssue({ code: 'custom', message: toDigits(value) ? invalidMessage : requiredMessage });
  });

/** The two boxes. Shapes come from `@duncit/regex`, which judges the digits only. */
export function makePhysicalGiftCardSchema(t: Translate) {
  return z.object({
    card_number: digitsRule(
      isPhysicalGiftCardNumber,
      t('mweb.giftCards.cardNumberRequired'),
      t('mweb.giftCards.cardNumberInvalid'),
    ),
    passcode: digitsRule(
      isPhysicalGiftCardPasscode,
      t('mweb.giftCards.passcodeRequired'),
      t('mweb.giftCards.passcodeInvalid'),
    ),
  });
}

export type PhysicalGiftCardValues = z.infer<ReturnType<typeof makePhysicalGiftCardSchema>>;

export const physicalGiftCardDefaults: PhysicalGiftCardValues = { card_number: '', passcode: '' };

/**
 * What the card-number box stores as it is typed or pasted: its digits, at most
 * nine. Capping here rather than with `maxLength` keeps a pasted
 * `123 456 789` whole — a length cap counts the spaces and cuts it short.
 */
export function formatPhysicalGiftCardNumber(raw: string): string {
  return toDigits(raw).slice(0, CARD_NUMBER_DIGITS);
}

/**
 * What the passcode box stores as it is typed or pasted: its digits, at most
 * sixteen, grouped `XXXX-XXXX-XXXX-XXXX` exactly as the card prints them, so
 * the person can check the box against the card group by group.
 */
export function formatPhysicalGiftCardPasscode(raw: string): string {
  const digits = toDigits(raw).slice(0, PASSCODE_DIGITS);
  const groups: string[] = [];
  for (let start = 0; start < digits.length; start += PASSCODE_GROUP) {
    groups.push(digits.slice(start, start + PASSCODE_GROUP));
  }
  return groups.join('-');
}

/** The `redeemPhysicalGiftCard` variables — the digits only, without the dashes. */
export function buildPhysicalGiftCardInput(values: Readonly<PhysicalGiftCardValues>): PhysicalGiftCardValues {
  return { card_number: toDigits(values.card_number), passcode: toDigits(values.passcode) };
}

/**
 * Why the server refused a printed card — its `extensions.reason`. `LOCKED` is
 * the brute-force pause (too many wrong passcodes); the rest are the card's own
 * state or a typo.
 */
export type PhysicalGiftCardRefusal =
  | 'INVALID_FORMAT'
  | 'MISMATCH'
  | 'LOCKED'
  | 'VOID'
  | 'OTHER_ACCOUNT'
  | 'ALREADY_REDEEMED'
  | 'EXPIRED';

/** The generic "could not be redeemed" line, shared with the emailed-code flow. */
const GENERIC_REDEEM_ERROR_KEY = 'mweb.giftCards.redeemError';

export type PhysicalGiftCardErrorKey =
  | 'mweb.giftCards.physicalErrorInvalidFormat'
  | 'mweb.giftCards.physicalErrorMismatch'
  | 'mweb.giftCards.physicalErrorLocked'
  | 'mweb.giftCards.physicalErrorVoid'
  | 'mweb.giftCards.physicalErrorOtherAccount'
  | 'mweb.giftCards.physicalErrorAlreadyRedeemed'
  | 'mweb.giftCards.physicalErrorExpired'
  | typeof GENERIC_REDEEM_ERROR_KEY;

/** Each refusal's sentence, every key written out so the translation gate sees it. */
const REFUSAL_KEYS: ReadonlyMap<string, PhysicalGiftCardErrorKey> = new Map<
  PhysicalGiftCardRefusal,
  PhysicalGiftCardErrorKey
>([
  ['INVALID_FORMAT', 'mweb.giftCards.physicalErrorInvalidFormat'],
  ['MISMATCH', 'mweb.giftCards.physicalErrorMismatch'],
  ['LOCKED', 'mweb.giftCards.physicalErrorLocked'],
  ['VOID', 'mweb.giftCards.physicalErrorVoid'],
  ['OTHER_ACCOUNT', 'mweb.giftCards.physicalErrorOtherAccount'],
  ['ALREADY_REDEEMED', 'mweb.giftCards.physicalErrorAlreadyRedeemed'],
  ['EXPIRED', 'mweb.giftCards.physicalErrorExpired'],
]);

/**
 * The localization key for a failed redemption, from the error's
 * `extensions.reason`. Anything else — a network failure, a reason this build
 * does not know yet — reads the generic line; the server's English message is
 * never what the member sees.
 */
export function physicalGiftCardErrorKey(reason: unknown): PhysicalGiftCardErrorKey {
  if (typeof reason !== 'string') return GENERIC_REDEEM_ERROR_KEY;
  return REFUSAL_KEYS.get(reason) ?? GENERIC_REDEEM_ERROR_KEY;
}
