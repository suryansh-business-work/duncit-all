import { Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import InfoGrid from './InfoGrid';

/** The Duncit Coin ledger row a card's redemption wrote. */
export interface CoinCredit {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

/**
 * The other half of a card's story: the coins its redemption put in the
 * member's balance, read from the coin ledger itself. Virtual and physical
 * cards both pay out through the same once-only credit, so one section serves
 * both.
 */
export default function CoinCreditSection({ credit }: Readonly<{ credit: CoinCredit | null }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const coins = (n: number) => formatMoney(n, { symbol: '' });

  return (
    <SectionCard title={t('loyalty.common.coinCreditTitle')} subtitle={t('loyalty.common.coinCreditSubtitle')}>
      {credit ? (
        <InfoGrid
          items={[
            { key: 'coins-credited', label: t('loyalty.common.coinsCredited'), value: coins(credit.amount) },
            { key: 'balance-after', label: t('loyalty.common.balanceAfter'), value: coins(credit.balance_after) },
            { key: 'credited-at', label: t('loyalty.common.creditedAt'), value: formatDateTime(credit.created_at) },
            { key: 'ledger-reason', label: t('loyalty.common.ledgerReason'), value: credit.reason, wide: true },
          ]}
        />
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="coin-credit-none">
          {t('loyalty.common.coinCreditNone')}
        </Typography>
      )}
    </SectionCard>
  );
}
