import { Divider, Stack } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import SectionBlock from './SectionBlock';
import { money, type PaymentGiftCardInfo } from './queries';

interface Props {
  card: PaymentGiftCardInfo;
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
}

/** The card this payment bought — the bearer code, who it was for, and what is
 * left on it. A gift card redeems into coins rather than at checkout, so the
 * balance is the whole story of whether the buyer's money reached anybody. */
export default function GiftCardBlock({ card, currencySymbol, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  // Empty on a self-purchase: the buyer IS the recipient, which is a fact worth
  // spelling out rather than printing a blank line.
  const recipient = card.recipient_email || t('finance.payment.giftCardSelfPurchase');
  const expires = card.expires_at ? formatDateTime(card.expires_at) : EM_DASH;
  const redeemed = card.redeemed_at ? formatDateTime(card.redeemed_at) : EM_DASH;

  return (
    <SectionBlock title={t('finance.payment.giftCardTitle')}>
      <Stack spacing={1} divider={<Divider flexItem />}>
        <InfoRow variant="split" label={t('finance.payment.giftCardCode')} value={card.code} />
        <InfoRow variant="split" label={t('finance.payment.giftCardRecipient')} value={recipient} />
        <InfoRow variant="split" label={t('finance.payment.giftCardName')} value={card.recipient_name || EM_DASH} />
        <InfoRow variant="split" label={t('finance.payment.giftCardScope')} value={card.scope_name || EM_DASH} />
        <InfoRow
          variant="split"
          label={t('finance.payment.giftCardValue')}
          value={money(currencySymbol, card.initial_amount)}
        />
        <InfoRow
          variant="split"
          label={t('finance.payment.giftCardBalance')}
          value={money(currencySymbol, card.balance)}
        />
        <InfoRow variant="split" label={t('finance.payment.giftCardStatus')} value={card.status} />
        <InfoRow variant="split" label={t('finance.payment.giftCardExpires')} value={expires} />
        <InfoRow variant="split" label={t('finance.payment.giftCardRedeemed')} value={redeemed} />
      </Stack>
    </SectionBlock>
  );
}
