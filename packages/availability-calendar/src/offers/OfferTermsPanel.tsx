import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { currentOfferTerms, venueOfferInboxStatus } from '@duncit/utils';
import { rupees } from '../pricing/format';
import PriceBreakdownView from '../pricing/preview/PriceBreakdownView';
import { offerTermsLabel } from './format';
import type { BookingOffer } from './queries';

interface Props {
  offer: BookingOffer;
  /** A free pod: the host settles the venue's charges directly, so no amount is quoted. */
  podIsFree: boolean;
}

/**
 * The terms on the table — the host's offer, or the venue's counter while it
 * waits — with where the request stands and the server's quote of them: what
 * the venue receives, Duncit's fee on top, what the host pays.
 */
export default function OfferTermsPanel({ offer, podIsFree }: Readonly<Props>) {
  const { t } = useTranslation();
  const status = venueOfferInboxStatus(offer);
  const terms = currentOfferTerms(offer);

  return (
    <Stack spacing={1.25} data-testid={`offer-terms-${offer.slot_id}`}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          {terms.by === 'VENUE' ? t('availability.offers.yourTerms') : t('availability.offers.hostTerms')}
        </Typography>
        <Typography variant="body2">{offerTermsLabel(t, terms.model, terms.rate)}</Typography>
        {status.key && <Chip size="small" color={status.tone} label={t(status.key)} data-testid="offer-status" />}
      </Stack>
      {podIsFree ? (
        <Alert severity="info">{t('availability.offers.freePod')}</Alert>
      ) : (
        <>
          <Stack spacing={0.25}>
            <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 800 }}>
              {t('availability.offers.youReceive', { vars: { amount: rupees(terms.quote.venue_payout) } })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('availability.offers.hostPays', { vars: { amount: rupees(terms.quote.total) } })}
            </Typography>
          </Stack>
          <PriceBreakdownView breakdown={terms.quote} />
        </>
      )}
    </Stack>
  );
}
