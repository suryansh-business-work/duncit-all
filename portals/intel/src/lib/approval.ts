import type { IntelApproval, IntelMe } from '@duncit/gql-types';

/**
 * Whether to SHOW Approve / Reject — the same rule the server enforces
 * (intelApproval.rules), used only to avoid offering a button that would be
 * refused. Production: an admin, and never the requester under four-eyes.
 * Staging: the requester or an admin.
 */
export function mayDecide(approval: Pick<IntelApproval, 'environment' | 'four_eyes' | 'requested_by'>, me: Pick<IntelMe, 'user_id' | 'can_admin'> | null | undefined): boolean {
  if (!me) return false;
  const mine = approval.requested_by === me.user_id;
  if (approval.environment === 'PRODUCTION') return me.can_admin && !(approval.four_eyes && mine);
  return mine || me.can_admin;
}
