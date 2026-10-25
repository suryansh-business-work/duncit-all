import { Stack, Typography } from '@mui/material';
import { VenueBillSummary } from '@duncit/ui';
import { buildVenueBillLines, formatMoney } from '@duncit/utils';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodSettlement } from '../types';

/**
 * What the venue's side comes to, above the split that takes it off the pool:
 * the terms agreed with the venue, then who came, the guests a per-guest
 * booking is paid for (never fewer than its minimum), the agreed amount, the
 * bill uploaded as its proof, any extra charges and the venue total.
 *
 * Every figure is the settlement's — nothing here adds two numbers together.
 */
export default function VenueSettlementSummary({ settlement }: Readonly<{ settlement: PodSettlement }>) {
  const { labels } = useHostPodActionsConfig();
  const symbol = settlement.currency_symbol;
  const model = settlement.venue_agreed_model;
  const rate = settlement.venue_agreed_rate;
  const lines = buildVenueBillLines(
    {
      slot_price: settlement.venue_slot_price,
      bill: settlement.venue_bill,
      slot_included: settlement.include_slot_price,
      venue_amount: settlement.waterfall.venue_amount,
      attended_seats: settlement.attended_seats,
      booked_seats: settlement.booked_seats,
      extra: settlement.venue_extra_amount,
      min_guests: settlement.venue_min_guests,
      // The guests the server priced the booking for: the people who came (or
      // the count entered), never below the agreed minimum.
      people_counted: settlement.venue_pax,
    },
    labels.venueBill,
    symbol,
  );

  return (
    <Stack spacing={1}>
      {/* A booking made before offers has no agreed terms to state. */}
      {model && rate != null && (
        <Stack
          direction="row"
          spacing={2}
          data-testid="settlement-agreed-terms"
          sx={{ justifyContent: 'space-between' }}
        >
          <Typography variant="body2">{labels.agreedTerms.title}</Typography>
          <Typography variant="body2" sx={{ textAlign: 'end' }}>
            {labels.agreedTerms.value(model, formatMoney(rate, { symbol, decimals: 2, grouping: false }))}
          </Typography>
        </Stack>
      )}
      <VenueBillSummary lines={lines} />
    </Stack>
  );
}
