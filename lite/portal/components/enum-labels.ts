import type { DuncitColumnOption } from '@duncit/table';
import type { StatusColorMap } from '@duncit/ui';
import type { LiteEventStatus, LitePaymentStatus, LiteRegistrationStatus, LiteVisibility } from '../../shared/graphql/documents';
import type { LiteEmailStatus } from '../graphql/email';

/** The catalogue key behind each enum value, spelled out so every key is greppable. */
export const EVENT_STATUS_KEYS: Record<LiteEventStatus, string> = {
  DRAFT: 'lite.eventStatus.DRAFT',
  PUBLISHED: 'lite.eventStatus.PUBLISHED',
  CANCELLED: 'lite.eventStatus.CANCELLED',
};

export const VISIBILITY_KEYS: Record<LiteVisibility, string> = {
  PUBLIC: 'lite.visibility.PUBLIC',
  UNLISTED: 'lite.visibility.UNLISTED',
  PRIVATE: 'lite.visibility.PRIVATE',
};

export const REGISTRATION_STATUS_KEYS: Record<LiteRegistrationStatus, string> = {
  PENDING_APPROVAL: 'lite.status.PENDING_APPROVAL',
  PAYMENT_PENDING: 'lite.status.PAYMENT_PENDING',
  CONFIRMED: 'lite.status.CONFIRMED',
  WAITLISTED: 'lite.status.WAITLISTED',
  DECLINED: 'lite.status.DECLINED',
  CANCELLED: 'lite.status.CANCELLED',
};

export const PAYMENT_STATUS_KEYS: Record<LitePaymentStatus, string> = {
  NOT_REQUIRED: 'lite.payment.NOT_REQUIRED',
  PENDING: 'lite.payment.PENDING',
  PAID: 'lite.payment.PAID',
  REJECTED: 'lite.payment.REJECTED',
};

export const EMAIL_STATUS_KEYS: Record<LiteEmailStatus, string> = {
  SENT: 'litePortal.emailLogs.status.SENT',
  FAILED: 'litePortal.emailLogs.status.FAILED',
  SKIPPED: 'litePortal.emailLogs.status.SKIPPED',
};

export const EVENT_STATUS_COLORS: StatusColorMap = { DRAFT: 'warning', PUBLISHED: 'success', CANCELLED: 'error' };
export const VISIBILITY_COLORS: StatusColorMap = { PUBLIC: 'success', UNLISTED: 'info', PRIVATE: 'default' };
export const REGISTRATION_STATUS_COLORS: StatusColorMap = {
  PENDING_APPROVAL: 'warning',
  PAYMENT_PENDING: 'warning',
  CONFIRMED: 'success',
  WAITLISTED: 'info',
  DECLINED: 'error',
  CANCELLED: 'default',
};
export const PAYMENT_STATUS_COLORS: StatusColorMap = { NOT_REQUIRED: 'default', PENDING: 'warning', PAID: 'success', REJECTED: 'error' };
export const EMAIL_STATUS_COLORS: StatusColorMap = { SENT: 'success', FAILED: 'error', SKIPPED: 'default' };

type Translate = (key: string) => string;

/** The `options` of an enum column, labelled in the reader's language. */
export function enumOptions<K extends string>(keys: Readonly<Record<K, string>>, t: Translate): DuncitColumnOption[] {
  return (Object.keys(keys) as K[]).map((value) => ({ value, label: t(keys[value]) }));
}

/** The sort/export text of an enum cell. */
export function enumLabel<K extends string>(keys: Readonly<Record<K, string>>, value: K, t: Translate): string {
  return t(keys[value]);
}
