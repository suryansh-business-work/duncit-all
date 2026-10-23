import { Alert, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { slotSpanLabel } from '@duncit/slots';
import { rupees } from '../pricing/format';
import OfferDecisionActions from './OfferDecisionActions';
import OfferHistory from './OfferHistory';
import OfferTermsPanel from './OfferTermsPanel';
import type { BookingRequestRow } from './queries';

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 140 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

/** One booking request: the pod, who asks, when and for how many, the terms on the table, how it went so far, and the answers. */
export default function OfferRequestCard({ request, onDone }: Readonly<{ request: BookingRequestRow; onDone: () => unknown }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const { offer } = request;
  const when = slotSpanLabel(request.start_at, request.end_at, request.whole_day, fmt, t('availability.wholeDay'));
  const guests = offer ? [t('availability.offers.guests', { vars: { n: offer.pax } }), offer.pets ? t('availability.offers.pets') : ''] : [];

  return (
    <Card variant="outlined" data-testid={`booking-request-${request.slot_id}`}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 800 }}>
              {request.pod_title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {`${request.venue_name} · ${t('availability.offers.requestedOn', { vars: { date: fmt.formatDateTime(request.requested_at) } })}`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Detail label={t('availability.offers.when')} value={when} />
            <Detail label={t('availability.offers.space')} value={offer?.space_label || t('availability.offers.wholeVenue')} />
            <Detail label={t('availability.offers.host')} value={request.host_name || '—'} />
            <Detail label={t('availability.offers.contact')} value={[request.host_email, request.host_phone].filter(Boolean).join(' · ') || '—'} />
            {guests.length > 0 && <Detail label={t('availability.offers.guestsLabel')} value={guests.filter(Boolean).join(' · ')} />}
          </Stack>
          <Divider />
          {offer ? (
            <>
              <OfferTermsPanel offer={offer} podIsFree={request.pod_is_free} />
              <OfferHistory history={offer.history} />
            </>
          ) : (
            <Alert severity="info">
              {t('availability.offers.noOffer')}
              {request.pod_is_free ? '' : ` ${rupees(request.price)}`}
            </Alert>
          )}
          <OfferDecisionActions request={request} offer={offer} onDone={onDone} />
        </Stack>
      </CardContent>
    </Card>
  );
}
