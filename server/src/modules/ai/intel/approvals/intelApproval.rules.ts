import type { IntelLevel } from '../intel.constants';

/**
 * Who may decide an approval — pure, so every rule is unit-tested.
 *  - Production: an Admin or Super Admin, and (four-eyes, on by default) never
 *    the person who asked for it.
 *  - Staging: the person who asked (they already hold write permission) or
 *    any Admin / Super Admin.
 */

export interface DecisionInput {
  deciderId: string;
  deciderLevel: IntelLevel;
  requesterId: string;
  environment: string;
  fourEyes: boolean;
}

export type DecisionVerdict = { ok: true } | { ok: false; reason: string };

export function mayDecide(input: DecisionInput): DecisionVerdict {
  const isRequester = input.deciderId === input.requesterId;
  const isAdmin = input.deciderLevel === 'ADMIN' || input.deciderLevel === 'SUPER_ADMIN';
  if (input.environment === 'PRODUCTION') {
    if (!isAdmin) return { ok: false, reason: 'Only an Admin or Super Admin can approve a production change.' };
    if (input.fourEyes && isRequester) return { ok: false, reason: 'A production change needs a second person: someone other than the requester must approve it.' };
    return { ok: true };
  }
  if (isRequester || isAdmin) return { ok: true };
  return { ok: false, reason: 'Only the requester or an Admin can decide this change.' };
}

/** Whether an approval is needed at all. Every write needs one; this only says how strict. */
export const needsFourEyes = (environment: string, fourEyesSetting: boolean): boolean => environment === 'PRODUCTION' && fourEyesSetting;
