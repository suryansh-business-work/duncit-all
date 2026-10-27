import { Box, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import InfoGrid from '../../../../components/detail/InfoGrid';
import type { GiftCardDetailCard } from './queries';

interface Props {
  card: GiftCardDetailCard;
  currencySymbol: string;
}

/** One face of the card artwork, frozen at purchase. */
function ArtworkFace({ url, label }: Readonly<{ url: string; label: string }>) {
  return (
    <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Box
        component="img"
        src={url}
        alt={label}
        loading="lazy"
        sx={{ width: '100%', aspectRatio: '1.586', objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
      />
    </Stack>
  );
}

/** What the card is: its value, its theme, its dates and the note it carries. */
export default function CardSummarySection({ card, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const money = (n: number) => formatMoney(n, { symbol: currencySymbol });
  const hasArtwork = Boolean(card.scope_image_front_url || card.scope_image_back_url);

  return (
    <SectionCard title={t('loyalty.virtual.summaryTitle')}>
      <Stack spacing={2}>
        <InfoGrid
          items={[
            { key: 'amount', label: t('loyalty.virtual.amount'), value: money(card.initial_amount) },
            { key: 'balance', label: t('loyalty.virtual.balance'), value: money(card.balance) },
            {
              key: 'theme',
              label: t('loyalty.virtual.theme'),
              value: `${card.scope_name || t('finance.giftCards.themeShop')} · ${card.scope_type}`,
            },
            { key: 'purchased', label: t('loyalty.virtual.purchased'), value: formatDateTime(card.created_at) },
            { key: 'expires', label: t('loyalty.virtual.expires'), value: formatDateTime(card.expires_at) },
            {
              key: 'redeemed-at',
              label: t('loyalty.virtual.redeemedAt'),
              value: card.redeemed_at ? formatDateTime(card.redeemed_at) : t('loyalty.virtual.notRedeemed'),
            },
            { key: 'message', label: t('loyalty.virtual.message'), value: card.message || EM_DASH, wide: true },
          ]}
        />
        {hasArtwork ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {card.scope_image_front_url && (
              <ArtworkFace url={card.scope_image_front_url} label={t('loyalty.virtual.artworkFront')} />
            )}
            {card.scope_image_back_url && (
              <ArtworkFace url={card.scope_image_back_url} label={t('loyalty.virtual.artworkBack')} />
            )}
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('loyalty.virtual.noArtwork')}
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}
