import { describe, expect, it } from 'vitest';
import { createTranslator } from '@duncit/i18n';
import { PORTAL_FALLBACK } from '../../../../shared/i18n';
import { flagCopy, type UserFlag } from '../../../pages/users/user-flags';
import { portalT } from '../../test-utils';

const { has } = createTranslator({ locale: 'en-IN', fallback: PORTAL_FALLBACK });
const vars = { vars: { name: 'Ravi' } };

describe('flagCopy', () => {
  it.each<[UserFlag, boolean, string, string, boolean]>([
    ['is_admin', true, 'Make Ravi an admin?', 'Ravi is now an admin', false],
    ['is_admin', false, 'Remove admin from Ravi?', 'Ravi is no longer an admin', true],
    ['is_blocked', true, 'Block Ravi?', 'Ravi is blocked', true],
    ['is_blocked', false, 'Unblock Ravi?', 'Ravi is unblocked', false],
  ])('%s → %s asks "%s", reports "%s" and is destructive: %s', (flag, next, title, done, destructive) => {
    const copy = flagCopy(flag, next);
    expect(portalT(copy.title, vars)).toBe(title);
    expect(portalT(copy.done, vars)).toBe(done);
    expect(copy.destructive).toBe(destructive);
    expect(has(copy.message)).toBe(true);
  });

  it('explains what each change does to the account', () => {
    expect(portalT(flagCopy('is_admin', true).message)).toBe('They can open this console and change anything in it.');
    expect(portalT(flagCopy('is_admin', false).message)).toBe('They keep their account but lose the console.');
    expect(portalT(flagCopy('is_blocked', true).message)).toBe('They can no longer sign in, host or register.');
    expect(portalT(flagCopy('is_blocked', false).message)).toBe('They can sign in again.');
  });
});
