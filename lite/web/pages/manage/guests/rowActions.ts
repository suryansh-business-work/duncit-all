import type { LiteRegistrationStatus } from '../../../../shared/graphql/documents';
import type { LiteRegistrationAction } from '../../../graphql/types';

/** The actions the API accepts for a guest in this state — mirrors registration.service. */
export function actionsFor(status: LiteRegistrationStatus, checkedIn: boolean): LiteRegistrationAction[] {
  switch (status) {
    case 'PENDING_APPROVAL':
      return ['APPROVE', 'DECLINE', 'REMOVE'];
    case 'PAYMENT_PENDING':
      return ['CONFIRM_PAYMENT', 'REJECT_PAYMENT', 'DECLINE', 'REMOVE'];
    case 'WAITLISTED':
      return ['DECLINE', 'REMOVE'];
    case 'CONFIRMED':
      return [checkedIn ? 'UNDO_CHECK_IN' : 'CHECK_IN', 'REMOVE'];
    case 'DECLINED':
      return ['REMOVE'];
    default:
      return [];
  }
}

/** The actions that take something away, so they ask first. */
export const DESTRUCTIVE_ACTIONS: ReadonlySet<LiteRegistrationAction> = new Set(['DECLINE', 'REJECT_PAYMENT', 'REMOVE']);
