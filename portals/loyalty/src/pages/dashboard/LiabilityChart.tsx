import { useTheme } from '@mui/material/styles';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import DoughnutCard from '../../components/DoughnutCard';
import type { LoyaltyOverview } from './useLoyaltyOverview';

/**
 * Where what Duncit owes in rewards sits right now: coins members hold, virtual
 * card value not yet redeemed, and coins printed on live scratch cards. One coin
 * is worth one unit of currency, so the three add up as reward value.
 */
export default function LiabilityChart({ overview }: Readonly<{ overview: LoyaltyOverview }>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { coins, cards, printed, loading } = overview;
  const symbol = cards?.currency_symbol ?? coins?.currency_symbol ?? '';

  return (
    <DoughnutCard
      title={t('loyalty.dashboard.liabilityTitle')}
      caption={t('loyalty.dashboard.liabilityCaption')}
      ariaLabel={t('loyalty.dashboard.liabilityTitle')}
      slices={[
        { label: t('loyalty.dashboard.coinsOutstanding'), value: coins?.total_outstanding ?? 0, color: palette.primary.main },
        { label: t('loyalty.dashboard.virtualOutstanding'), value: cards?.outstanding_value ?? 0, color: palette.secondary.main },
        { label: t('loyalty.dashboard.physicalOutstanding'), value: printed?.outstanding_coins ?? 0, color: palette.warning.main },
      ]}
      loading={loading.coins || loading.cards || loading.printed}
      emptyText={t('loyalty.dashboard.liabilityEmpty')}
      formatValue={(value) => formatMoney(value, { symbol })}
    />
  );
}
