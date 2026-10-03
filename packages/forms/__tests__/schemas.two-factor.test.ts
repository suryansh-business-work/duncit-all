/**
 * The authenticator-app code box: six digits from the app, or — where a lost
 * phone must not lock someone out — an eight-character recovery code typed the
 * way people copy it (any case, with or without the dash and spaces).
 */
import { describe, expect, it } from 'vitest';

import { makeTwoFactorCodeSchema, twoFactorCodeDefaults } from '../src/schemas';

/** Hands back the key, so a message failure names the key that was wrong. */
const t = (key: string) => key;

const messagesFor = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('makeTwoFactorCodeSchema — setting up (app codes only)', () => {
  const schema = makeTwoFactorCodeSchema(t, { allowRecovery: false });

  it('accepts the six digits an authenticator app shows, trimmed', () => {
    expect(schema.safeParse({ code: '482913' }).success).toBe(true);
    expect(schema.parse({ code: '  482913 ' })).toEqual({ code: '482913' });
  });

  it('refuses a recovery code — only the app can prove the scan', () => {
    const result = schema.safeParse({ code: 'ABCD-EFGH' });
    expect(result.success).toBe(false);
    expect(messagesFor(result)).toEqual(['shell.twoFactor.validation.code']);
  });

  it('refuses five or seven digits, letters and an empty box', () => {
    for (const code of ['48291', '4829131', '48a913', '']) {
      expect(messagesFor(schema.safeParse({ code }))).toEqual(['shell.twoFactor.validation.code']);
    }
  });
});

describe('makeTwoFactorCodeSchema — signing in and turning it off (recovery allowed)', () => {
  const schema = makeTwoFactorCodeSchema(t, { allowRecovery: true });

  it('still accepts an app code', () => {
    expect(schema.safeParse({ code: '482913' }).success).toBe(true);
  });

  it('accepts a recovery code with or without its dash and spaces', () => {
    for (const code of ['ABCD-EFGH', 'abcdefgh', 'ABCD EFGH', ' abcd-efgh ']) {
      expect(schema.safeParse({ code }).success).toBe(true);
    }
  });

  it('refuses a recovery code of the wrong length, naming both accepted forms', () => {
    for (const code of ['ABCD-EFG', 'ABCD-EFGHI', '']) {
      expect(messagesFor(schema.safeParse({ code }))).toEqual(['shell.twoFactor.validation.codeOrRecovery']);
    }
  });
});

describe('twoFactorCodeDefaults', () => {
  it('starts with an empty code box', () => {
    expect(twoFactorCodeDefaults).toEqual({ code: '' });
  });
});
