import { Alert, AlertTitle, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { money } from '../../pod-finance-page/queries';

interface Props {
  /** What the payouts send out beyond what the pod collected. */
  shortfall: number;
  /** True while payouts carrying it still wait — approving them needs a funding note. */
  pending: boolean;
  symbol: string;
}

/**
 * The request pays out more than its pod took: the host's side of the pool
 * came to less than zero, but the venue and the other payouts are still paid in
 * full. That money leaves from somewhere other than the pod, so Finance sees
 * how much — in plain words — before approving anything.
 */
export default function FundingShortfallAlert({ shortfall, pending, symbol }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Alert severity="warning" data-testid="release-funding-shortfall">
      <AlertTitle>
        {t('finance.paymentRelease.shortfallTitle', { vars: { amount: money(symbol, shortfall) } })}
      </AlertTitle>
      <Typography variant="body2">{t('finance.paymentRelease.shortfallBody')}</Typography>
      {pending && (
        <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
          {t('finance.paymentRelease.shortfallNeedsNote')}
        </Typography>
      )}
    </Alert>
  );
}
