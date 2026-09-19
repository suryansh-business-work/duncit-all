import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { LiteEventStatus, LitePaymentStatus, LiteRegistrationStatus } from '../../shared/graphql/documents';
import { useWebT } from '../../shared/i18n';

const REGISTRATION_COLORS: StatusColorMap = {
  PENDING_APPROVAL: 'warning',
  PAYMENT_PENDING: 'warning',
  CONFIRMED: 'success',
  WAITLISTED: 'info',
  DECLINED: 'error',
  CANCELLED: 'default',
};

const PAYMENT_COLORS: StatusColorMap = {
  NOT_REQUIRED: 'default',
  PENDING: 'warning',
  PAID: 'success',
  REJECTED: 'error',
};

const EVENT_COLORS: StatusColorMap = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  CANCELLED: 'error',
};

/** A guest's place at the event, in words and colour. */
export function RegistrationStatusChip({ status }: Readonly<{ status: LiteRegistrationStatus }>) {
  const { t } = useWebT();
  return <StatusChip status={status} colorMap={REGISTRATION_COLORS} label={t(`lite.status.${status}`)} data-testid="registration-status-chip" />;
}

/** Whether the ticket is paid for. */
export function PaymentStatusChip({ status }: Readonly<{ status: LitePaymentStatus }>) {
  const { t } = useWebT();
  return <StatusChip status={status} colorMap={PAYMENT_COLORS} label={t(`lite.payment.${status}`)} variant="outlined" data-testid="payment-status-chip" />;
}

/** Draft, published or cancelled. */
export function EventStatusChip({ status }: Readonly<{ status: LiteEventStatus }>) {
  const { t } = useWebT();
  return <StatusChip status={status} colorMap={EVENT_COLORS} label={t(`lite.eventStatus.${status}`)} data-testid="event-status-chip" />;
}
