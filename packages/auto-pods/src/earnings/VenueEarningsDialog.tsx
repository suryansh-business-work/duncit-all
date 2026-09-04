import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  autoPodSpaceEarnings,
  autoPodVenueSpaces,
  type AutoPodLabels,
  type AutoPodVenueSpace,
} from '@duncit/utils';
import { EarningsDialogShell } from './EarningsDialogShell';
import type { AutoPodVenueOption } from '../venue/AutoPodVenuePicker';

interface SpaceRowProps {
  space: AutoPodVenueSpace;
  price: string;
  onPrice: (value: string) => void;
  labels: AutoPodLabels;
  formatMoney: (amount: number) => string;
}

/**
 * One of the venue's spaces, priced by the venue itself. The capacity is the
 * venue's own published number and the multiplication is spelled out —
 * "₹250 × 6 = ₹1,500" — because the point of the dialog is to show the venue
 * where the figure came from, not just the total.
 */
function VenueSpaceRow({ space, price, onPrice, labels, formatMoney }: Readonly<SpaceRowProps>) {
  const amount = Number(price) || 0;
  const total = autoPodSpaceEarnings(amount, space.capacity);
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between' }}
        >
          <Typography variant="subtitle2">{space.label || labels.earningsWholeVenue}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {labels.earningsSpaceCapacity(space.capacity)}
          </Typography>
        </Stack>
        <TextField
          size="small"
          type="number"
          label={labels.ticketPrice}
          value={price}
          onChange={(event) => onPrice(event.target.value)}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
        />
        {total === null ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {labels.earningsEnterPrice}
          </Typography>
        ) : (
          <Typography
            variant="body2"
            data-testid="auto-pod-space-earning"
            sx={{ color: 'success.main', fontWeight: 600 }}
          >
            {labels.earningsFormula(formatMoney(amount), space.capacity, formatMoney(total))}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export interface VenueEarningsDialogProps {
  /** The venue chosen at the top of the queue — whose spaces are listed. */
  venue: AutoPodVenueOption | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  formatMoney: (amount: number) => string;
  /** The best figure the venue reached, handed back for the card's earn line. */
  onEarnings?: (amount: number | null) => void;
}

/**
 * A venue's "View Potential Earnings": every space it publishes, with its
 * capacity, and a ticket price the venue types per space. What a space could
 * take is Ticket Price × Slots, which is the pod's gross at that space — it is
 * deliberately NOT the payout after Finance's deductions, because the venue is
 * sizing the opportunity here rather than reading a settlement.
 *
 * Nothing is saved: this is a calculator the venue opens, reads and closes. The
 * figure it reaches rides back to the card so "You could earn" stops reading
 * blank, and the card falls back to the server's own figure once the pod has a
 * real ticket price.
 */
export function VenueEarningsDialog({
  venue,
  labels,
  open,
  onClose,
  formatMoney,
  onEarnings,
}: Readonly<VenueEarningsDialogProps>) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const spaces = autoPodVenueSpaces(venue);

  const setPrice = (key: string, value: string) => setPrices((prev) => ({ ...prev, [key]: value }));

  // The card shows ONE number, so the best a space could take is the one that
  // rides back — a venue comparing spaces is picking the one it would offer.
  const handleClose = () => {
    if (onEarnings) {
      const totals = spaces
        .map((space, index) => autoPodSpaceEarnings(Number(prices[spaceKey(space, index)]) || 0, space.capacity))
        .filter((total): total is number => total !== null);
      onEarnings(totals.length > 0 ? Math.max(...totals) : null);
    }
    onClose();
  };

  return (
    <EarningsDialogShell labels={labels} open={open} onClose={handleClose}>
      {spaces.length === 0 ? (
        <Alert severity="info">{labels.earningsNoSpaces}</Alert>
      ) : (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.earningsSpacesHint}
          </Typography>
          {spaces.map((space, index) => {
            const key = spaceKey(space, index);
            return (
              <VenueSpaceRow
                key={key}
                space={space}
                price={prices[key] ?? ''}
                onPrice={(value) => setPrice(key, value)}
                labels={labels}
                formatMoney={formatMoney}
              />
            );
          })}
        </>
      )}
    </EarningsDialogShell>
  );
}

/** A space's own identity for React and for the price map. Labels are the
 * venue's own free text and two spaces may share one, so the index disambiguates
 * rather than standing in as the key (S6479). */
const spaceKey = (space: AutoPodVenueSpace, index: number) => `${index}-${space.label}`;
