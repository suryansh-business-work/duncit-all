import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { OfferQuoteRange } from '@duncit/utils';
import { rupeesRange } from './format';
import type { OfferSide } from './offer-target';

interface Props {
  /** VENUE: "You receive …" first; HOST (and Duncit staff): what it costs the pod, then what the venue receives. */
  side: OfferSide;
  /** The money at the fewest guests and at the most (`offerQuoteRange`, or an offer line's own). */
  range: Readonly<Omit<OfferQuoteRange, 'ranged'>>;
}

/**
 * What a booking's terms come to, as a range from the venue's minimum guests to
 * the pod's spots — one amount when both ends agree. The server priced both
 * ends; nothing is computed here.
 */
export default function OfferMoney({ side, range }: Readonly<Props>) {
  const { t } = useTranslation();
  const venue = rupeesRange(range.venueMin, range.venueMax);
  const total = rupeesRange(range.totalMin, range.totalMax);
  const venueSide = side === 'VENUE';

  return (
    <Stack spacing={0.25} data-testid="offer-money">
      <Typography variant="body1" sx={{ color: venueSide ? 'success.main' : 'text.primary', fontWeight: 800 }}>
        {venueSide
          ? t('availability.offers.youReceive', { vars: { amount: venue } })
          : t('availability.offers.chat.podPays', { vars: { amount: total } })}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {venueSide
          ? t('availability.offers.hostPays', { vars: { amount: total } })
          : t('availability.offers.venueReceives', { vars: { amount: venue } })}
      </Typography>
    </Stack>
  );
}
