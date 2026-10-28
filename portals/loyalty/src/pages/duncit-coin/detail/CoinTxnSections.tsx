import { Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import InfoGrid, { type InfoItem } from '../../../components/detail/InfoGrid';
import { sourceLabel } from '../CoinTransactionsTable/columns';
import { coinCount, type CoinTxnDetail } from '../queries';

interface Props {
  txn: CoinTxnDetail;
  currencySymbol: string;
}

/** What moved: the coins, the balance it left, why, and who typed it when a person did. */
export function TransactionSection({ txn }: Readonly<Pick<Props, 'txn'>>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <SectionCard title={t('loyalty.coinTxn.transactionTitle')}>
      <InfoGrid
        items={[
          { key: 'when', label: t('finance.common.when'), value: formatDateTime(txn.created_at) },
          { key: 'source', label: t('finance.duncitCoin.source'), value: sourceLabel(t).get(txn.source) ?? txn.source },
          { key: 'coins', label: t('finance.duncitCoin.coins'), value: coinCount(txn.amount) },
          { key: 'balance-after', label: t('finance.duncitCoin.balanceAfter'), value: coinCount(txn.balance_after) },
          { key: 'typed-by', label: t('loyalty.coinTxn.typedBy'), value: txn.admin_name || t('loyalty.coinTxn.automatic') },
          { key: 'txn-id', label: t('loyalty.coinTxn.ledgerId'), value: txn.id },
          { key: 'reason', label: t('finance.common.reason'), value: txn.reason || EM_DASH, wide: true },
        ]}
      />
    </SectionCard>
  );
}

/** Whose balance it moved. */
export function MemberSection({ txn }: Readonly<Pick<Props, 'txn'>>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('loyalty.coinTxn.memberTitle')}>
      <InfoGrid
        items={[
          { key: 'member-name', label: t('finance.duncitCoin.user'), value: txn.user_name || EM_DASH },
          { key: 'member-email', label: t('loyalty.coinTxn.email'), value: txn.user_email || EM_DASH },
          { key: 'member-id', label: t('loyalty.coinTxn.accountId'), value: txn.user_id },
        ]}
      />
    </SectionCard>
  );
}

/** The pods a payment touched, one per line — a shop cart can span several. */
function PodList({ txn }: Readonly<Pick<Props, 'txn'>>) {
  return (
    <Stack spacing={0.25}>
      {txn.pods.map((pod) => (
        <Typography key={pod.id} variant="body2">
          {`${pod.title} · ${pod.slug}`}
        </Typography>
      ))}
    </Stack>
  );
}

/** The event the coins came from or went to: a payment and its pods, a referral, a gift card, a backout or a rating. */
export function OriginSection({ txn, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const items: InfoItem[] = [];
  if (txn.payment_id) {
    items.push(
      { key: 'payment-id', label: t('finance.common.payment'), value: txn.payment_id },
      { key: 'order-total', label: t('finance.duncitCoin.orderTotal'), value: formatMoney(txn.payment_total, { symbol: currencySymbol }) }
    );
  }
  if (txn.earn_pct > 0) items.push({ key: 'earn-pct', label: t('loyalty.coinTxn.earnRate'), value: `${txn.earn_pct}%` });
  if (txn.spend_amount > 0) {
    items.push({ key: 'spend', label: t('loyalty.coinTxn.earnedOn'), value: formatMoney(txn.spend_amount, { symbol: currencySymbol }) });
  }
  if (txn.referral_id) items.push({ key: 'referral-id', label: t('loyalty.coinTxn.referralId'), value: txn.referral_id });
  if (txn.gift_card_id) items.push({ key: 'gift-card-id', label: t('loyalty.coinTxn.giftCardId'), value: txn.gift_card_id });
  if (txn.backout_id) items.push({ key: 'backout-id', label: t('loyalty.coinTxn.backoutId'), value: txn.backout_id });
  if (txn.feedback_id) items.push({ key: 'feedback-id', label: t('loyalty.coinTxn.feedbackId'), value: txn.feedback_id });
  if (txn.pods.length > 0) items.push({ key: 'pods', label: t('finance.common.pod'), value: <PodList txn={txn} />, wide: true });

  return (
    <SectionCard title={t('loyalty.coinTxn.originTitle')}>
      {items.length > 0 ? (
        <InfoGrid items={items} />
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="coin-txn-no-origin">
          {t('loyalty.coinTxn.noOrigin')}
        </Typography>
      )}
    </SectionCard>
  );
}

/** When the unspent part of a grant lapses, and how much of it is still unspent. */
export function ExpirySection({ txn }: Readonly<Pick<Props, 'txn'>>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <SectionCard title={t('loyalty.coinTxn.expiryTitle')} subtitle={t('loyalty.coinTxn.expirySubtitle')}>
      <InfoGrid
        items={[
          {
            key: 'expires',
            label: t('loyalty.coinTxn.expires'),
            value: txn.expires_at ? formatDateTime(txn.expires_at) : t('loyalty.coinTxn.neverExpires'),
          },
          { key: 'remaining', label: t('loyalty.coinTxn.remaining'), value: coinCount(txn.remaining) },
        ]}
      />
    </SectionCard>
  );
}
