import { Chip } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { statusLabel } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  ORDER_STATUS_COLORS,
  PAYMENT_METHOD_KEYS,
  RETURN_STATUS_COLORS,
  RETURN_STATUS_KEYS,
  codeLabel,
} from '../lib/status';

/** An order's fulfilment status in the shared vocabulary and tone. */
export function OrderStatusChip({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  return <StatusChip status={status} label={statusLabel(status, t)} colorMap={ORDER_STATUS_COLORS} />;
}

/** Where a return has got to. */
export function ReturnStatusChip({ status }: Readonly<{ status: string }>) {
  const { t } = useTranslation();
  return <StatusChip status={status} label={codeLabel(RETURN_STATUS_KEYS, status, t)} colorMap={RETURN_STATUS_COLORS} />;
}

/** Paid up front, or cash on delivery. */
export function PaymentMethodChip({ method }: Readonly<{ method: string }>) {
  const { t } = useTranslation();
  const color = method === 'COD' ? 'warning' : 'default';
  return <Chip size="small" variant="outlined" color={color} label={codeLabel(PAYMENT_METHOD_KEYS, method, t)} />;
}

/** A buyer who checked out without an account. */
export function GuestChip() {
  const { t } = useTranslation();
  return <Chip size="small" label={t('ecommPortal.common.guest')} />;
}

/** On or off, in words — never colour alone. */
export function FlagChip({ on, onLabel, offLabel }: Readonly<{ on: boolean; onLabel: string; offLabel: string }>) {
  return <Chip size="small" color={on ? 'success' : 'default'} variant={on ? 'filled' : 'outlined'} label={on ? onLabel : offLabel} />;
}
