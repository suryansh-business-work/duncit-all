import { Chip } from '@mui/material';
import type { ReleaseKind } from './queries';
import { useTranslation } from '@duncit/app-settings';

type KindChipColor = 'info' | 'secondary' | 'success' | 'warning';

type Translate = ReturnType<typeof useTranslation>['t'];

const kindChips = (t: Translate): Record<ReleaseKind, { label: string; color: KindChipColor }> => ({
  VENUE_BILLING: { label: t('finance.paymentRelease.venueBilling'), color: 'info' },
  HOST_PAYMENT: { label: t('finance.paymentRelease.hostPayment'), color: 'secondary' },
  CLUB_ADMIN: { label: t('finance.common.clubAdmin'), color: 'success' },
  ECOMM_PAYMENT: { label: t('finance.paymentRelease.eCommerceBrand'), color: 'warning' },
});

export function ReleaseKindChip({ kind }: Readonly<{ kind: ReleaseKind }>) {
  const { t } = useTranslation();
  const chip = kindChips(t)[kind] ?? kindChips(t).HOST_PAYMENT;
  return <Chip size="small" label={chip.label} color={chip.color} />;
}
