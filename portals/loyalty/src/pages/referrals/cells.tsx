import { Chip } from '@mui/material';
import type { Translator } from '@duncit/app-settings';
import type { ReferralPayoutStatus } from './queries';

type Translate = Translator['t'];
type ChipColor = 'success' | 'warning' | 'error' | 'default' | 'info';

export const codeChip = (code: string) => <Chip size="small" label={code} sx={{ fontWeight: 800 }} />;

const PAYOUT_COLORS: Record<ReferralPayoutStatus, ChipColor> = {
  PAID: 'success',
  PARTIAL: 'warning',
  UNPAID: 'error',
};

/** Literal keys per status — the localization gate greps for `t('…')`. */
export const payoutLabels = (t: Translate): Record<ReferralPayoutStatus, string> => ({
  PAID: t('loyalty.referrals.payoutPaid'),
  PARTIAL: t('loyalty.referrals.payoutPartial'),
  UNPAID: t('loyalty.referrals.payoutUnpaid'),
});

export function PayoutChip({ status, t }: Readonly<{ status: ReferralPayoutStatus; t: Translate }>) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={PAYOUT_COLORS[status]}
      label={payoutLabels(t)[status]}
      sx={{ fontWeight: 800 }}
    />
  );
}

/** Whether the member a code brought in has paid for anything yet. */
export function ConvertedChip({ converted, t }: Readonly<{ converted: boolean; t: Translate }>) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={converted ? 'success' : 'default'}
      label={converted ? t('loyalty.referrals.convertedYes') : t('loyalty.referrals.convertedNo')}
      sx={{ fontWeight: 800 }}
    />
  );
}

/** converted / joined as a whole-ish percentage; 0 when nobody joined. */
export const conversionText = (converted: number, joined: number) =>
  `${joined > 0 ? Math.round((converted / joined) * 1000) / 10 : 0}%`;
