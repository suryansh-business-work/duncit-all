import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import {
  rentalRefundStateKey,
  rentalRefundStateOf,
  rentalRefundTone,
  rentalStatusKey,
  type RentalBookingStatus,
  type RentalRefundTone,
} from '@duncit/utils';

type ChipColor = 'default' | 'info' | 'success' | 'warning' | 'error';

const STATUS_COLOR: Record<RentalBookingStatus, ChipColor> = {
  BOOKED: 'info',
  UNAVAILABLE: 'warning',
  CANCELLED: 'default',
  RELEASED: 'default',
  RETURNED: 'success',
  DAMAGED: 'error',
};

/** The shared refund tones, in MUI's chip palette. */
const TONE_COLOR: Record<RentalRefundTone, ChipColor> = {
  neutral: 'default',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

type RefundStateRow = Parameters<typeof rentalRefundStateOf>[0];

/** How the rental closed (or that it is still out). */
export function RentalStatusChip({ status }: Readonly<{ status: RentalBookingStatus }>) {
  const { t } = useTranslation();
  return <Chip size="small" color={STATUS_COLOR[status]} label={t(rentalStatusKey(status))} />;
}

/** Where the rental's Razorpay refund stands, read the way the server reads it. */
export function RentalRefundStateChip({ row }: Readonly<{ row: RefundStateRow }>) {
  const { t } = useTranslation();
  const state = rentalRefundStateOf(row);
  return (
    <Chip
      size="small"
      variant="outlined"
      color={TONE_COLOR[rentalRefundTone(state)]}
      label={t(rentalRefundStateKey(state))}
      data-testid="rental-refund-state"
    />
  );
}
