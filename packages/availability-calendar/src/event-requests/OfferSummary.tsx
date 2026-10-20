import { Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { rupees } from '../pricing/format';
import type { EventRequestOfferView } from './queries';

interface Props {
  offer: EventRequestOfferView | null | undefined;
  responseNote?: string;
}

/** The window the owner offered and its frozen price — what the member was told. */
export default function OfferSummary({ offer, responseNote }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  if (!offer && !responseNote) return null;
  return (
    <Stack spacing={0.25} data-testid="event-request-offer">
      {offer && (
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {t('venuePricing.offer.window', {
            vars: { when: `${fmt.formatDateTime(offer.start_at)} – ${fmt.formatTime(offer.end_at)}`, pax: offer.pax },
          })}
        </Typography>
      )}
      {offer?.quote && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venuePricing.offer.price', {
            vars: { total: rupees(offer.quote.total), payout: rupees(offer.quote.venue_payout) },
          })}
        </Typography>
      )}
      {responseNote && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venuePricing.offer.note', { vars: { note: responseNote } })}
        </Typography>
      )}
    </Stack>
  );
}
