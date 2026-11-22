import {
  rentalRefundStateKey,
  rentalRefundStateOf,
  rentalRefundTone,
  type FulfilmentTone,
  type RentalRefundTone,
} from '@duncit/utils';

import { ToneChip } from '@/components/brand-orders/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';

/** The refund tones in the shared chip's palette, so the app colours them as the web does. */
const CHIP_TONE: Readonly<Record<RentalRefundTone, FulfilmentTone>> = {
  neutral: 'neutral',
  info: 'moving',
  success: 'done',
  warning: 'pending',
  error: 'failed',
};

export type RefundChipRow = Parameters<typeof rentalRefundStateOf>[0];

/** Where a rental's Razorpay refund stands, as a chip — an older server's row read the way the server would. */
export function RentalRefundChip({
  row,
  testID,
}: Readonly<{ row: RefundChipRow; testID?: string }>) {
  const { t } = useTranslation();
  const state = rentalRefundStateOf(row);
  return (
    <ToneChip
      label={t(rentalRefundStateKey(state))}
      tone={CHIP_TONE[rentalRefundTone(state)]}
      testID={testID}
    />
  );
}
