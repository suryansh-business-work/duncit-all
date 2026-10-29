import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { EarningsSplitView, VenueBillSummary } from '@duncit/ui';
import { buildVenueBillLines, isFreeVenueOfferModel, shellVenueBillLabels } from '@duncit/utils';
import { offerTermsLabel } from '@duncit/availability-calendar';
import { useTranslation } from '@duncit/shell';
import { POD_SETTLEMENT_PREVIEW } from '../queries';
import type { SettlementPreviewProps } from './complete-pod.types';

/** Live waterfall preview of the settlement for the pod being completed. */
export default function SettlementPreview({
  podId,
  venueBillAmount,
  venueExtraAmount,
  hostUserId,
  venueUsage,
  free = false,
  onFreeVenue,
}: Readonly<SettlementPreviewProps>) {
  const { t } = useTranslation();
  // The bill, the extra charges and the usage settle for a moment before the preview re-prices.
  const [typed, setTyped] = useState({ amount: venueBillAmount, extra: venueExtraAmount, usage: venueUsage ?? {} });
  useEffect(() => {
    const timer = setTimeout(
      () => setTyped({ amount: venueBillAmount, extra: venueExtraAmount, usage: venueUsage ?? {} }),
      350,
    );
    return () => clearTimeout(timer);
  }, [venueBillAmount, venueExtraAmount, venueUsage]);

  const { data, loading, error } = useQuery<any>(POD_SETTLEMENT_PREVIEW, {
    variables: {
      pod_id: podId,
      venue_bill_amount: typed.amount,
      host_user_id: hostUserId || null,
      // Always sent (0 included), never the old slot-price choice: the venue is
      // paid the agreed amount plus these, with the bill as its proof.
      venue_extra_amount: typed.extra,
      ...typed.usage,
    },
    fetchPolicy: 'cache-and-network',
  });
  const s = data?.podSettlementPreview;
  // A free pod moves no platform money — its host settles the venue directly.
  const isFree = free || !!s?.is_free;
  // A free venue is owed nothing for the booking: the dialog then asks for its bill only with extras.
  const freeVenue = isFreeVenueOfferModel(s?.venue_agreed_model);
  useEffect(() => {
    onFreeVenue?.(freeVenue);
  }, [freeVenue, onFreeVenue]);

  const body = () => {
    if (!s) {
      if (loading) return <CircularProgress size={18} />;
      // Never swallow the server's reason — a hidden error here is exactly how
      // "the calculation doesn't appear" bugs are born.
      return (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
          {/* Apollo 4 hands back ONE error whose message already carries the
              server's reason. */}
          {error?.message ?? 'Preview unavailable.'}
        </Typography>
      );
    }
    if (isFree) {
      return (
        <Typography variant="caption" data-testid="settlement-free-note" sx={{ color: 'text.secondary' }}>
          {t('shell.hostShare.freeNote')}
        </Typography>
      );
    }
    // The same four-way split (host first) as every other pod money view.
    return (
      <Stack spacing={1}>
        {s.has_venue && s.venue_agreed_model && s.venue_agreed_rate != null && (
          <Stack direction="row" spacing={2} data-testid="settlement-agreed-terms" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2">{t('availability.offers.agreedTerms')}</Typography>
            <Typography variant="body2" sx={{ textAlign: 'end' }}>
              {offerTermsLabel(t, s.venue_agreed_model, s.venue_agreed_rate)}
            </Typography>
          </Stack>
        )}
        {s.has_venue && (
          <VenueBillSummary
            lines={buildVenueBillLines(
              {
                slot_price: s.venue_slot_price,
                bill: s.venue_bill,
                slot_included: s.include_slot_price,
                venue_amount: s.waterfall.venue_amount,
                attended_seats: s.attended_seats,
                booked_seats: s.booked_seats,
                extra: s.venue_extra_amount,
                min_guests: s.venue_min_guests,
                // The guests the server priced a per-guest booking for — never below its minimum.
                people_counted: s.venue_pax,
              },
              shellVenueBillLabels(t),
              s.currency_symbol,
            )}
          />
        )}
        <EarningsSplitView waterfall={s.waterfall} symbol={s.currency_symbol} viewer="staff" />
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {t('admin.completePod.payoutNote')}
        </Typography>
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,79,115,0.08)' }}>
      <Typography
        variant="subtitle2"
        data-testid={isFree ? 'settlement-free' : undefined}
        sx={{ fontWeight: 900, mb: 0.5 }}
      >
        {isFree ? t('shell.hostShare.freePod') : t('admin.completePod.previewTitle')}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {body()}
    </Box>
  );
}
