import { Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import InfoGrid from '../../../../components/detail/InfoGrid';
import type { GiftCardDetailCard } from './queries';

/** A name over its email — the shape every person on the card reads in. */
function Person({ name, email }: Readonly<{ name: string; email: string }>) {
  return (
    <Stack component="span" sx={{ minWidth: 0 }}>
      <Typography component="span" variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
        {name || EM_DASH}
      </Typography>
      <Typography component="span" variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
        {email || EM_DASH}
      </Typography>
    </Stack>
  );
}

/**
 * Who bought it, who it was for, and who turned it into coins. A card bought
 * for oneself has no recipient — the buyer holds it — and a bearer card can be
 * redeemed by someone who is neither, which is exactly what this shows.
 */
export default function PeopleSection({ card, phone }: Readonly<{ card: GiftCardDetailCard; phone: string | null }>) {
  const { t } = useTranslation();
  const selfPurchase = !card.recipient_email;

  return (
    <SectionCard title={t('loyalty.virtual.peopleTitle')}>
      <InfoGrid
        items={[
          {
            key: 'buyer',
            label: t('loyalty.virtual.buyer'),
            value: <Person name={card.purchaser_name} email={card.purchaser_email} />,
          },
          { key: 'buyer-phone', label: t('loyalty.virtual.buyerPhone'), value: phone || EM_DASH },
          {
            key: 'recipient',
            label: t('loyalty.virtual.recipient'),
            value: selfPurchase ? (
              t('loyalty.virtual.selfPurchase')
            ) : (
              <Person name={card.recipient_name} email={card.recipient_email} />
            ),
          },
          {
            key: 'redeemer',
            label: t('loyalty.virtual.redeemer'),
            value: card.redeemed ? (
              <Person name={card.redeemer_name} email={card.redeemer_email} />
            ) : (
              t('loyalty.virtual.notRedeemed')
            ),
          },
        ]}
      />
    </SectionCard>
  );
}
