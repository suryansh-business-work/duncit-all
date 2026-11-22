import { Chip } from '@mui/material';
import { giftCardOrderHeadline, type GiftCardOrderStatusFacts, type GiftCardOrderTone } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

const CHIP_COLOR: Record<GiftCardOrderTone, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  error: 'error',
  neutral: 'default',
};

/** The order's headline — payment until paid, then where the cards are (shared with native). */
export default function OrderStatusChip({ order, testId }: Readonly<{ order: GiftCardOrderStatusFacts; testId?: string }>) {
  const { t } = useTranslation();
  const { key, tone } = giftCardOrderHeadline(order);
  return <Chip data-testid={testId} size="small" color={CHIP_COLOR[tone]} label={t(key)} sx={{ fontWeight: 700 }} />;
}
