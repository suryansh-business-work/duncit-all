import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import type { AutoPodRow, AutoPodLabels } from '@duncit/utils';
import { AUTO_POD_VENUE_SLOTS, VENUE_ACCEPT_AUTO_POD } from '../queries';
import { enrolmentFailure } from '../failure-message';
import type { AutoPodVenueOption } from './AutoPodVenuePicker';
import { NoSlotsNotice, VenueAcceptContext } from './VenueAcceptSections';

/** One of the venue's free slots, priced as the venue would be paid for it. */
export interface AutoPodVenueSlot {
  id: string;
  start_at: string;
  end_at: string;
  whole_day: boolean;
  space_label: string;
  capacity: number;
  price: number;
  venue_receives: number;
  venue_commission_pct: number;
  host_receives: number;
  viable: boolean;
}

interface VenueSlotsData {
  autoPodVenueSlots: {
    window_days: number;
    expires_at: string | null;
    slots: AutoPodVenueSlot[];
  };
}

export interface VenueAcceptDialogProps {
  row: AutoPodRow | null;
  /** The venue chosen at the top of the queue — the one this accept commits. */
  venue: AutoPodVenueOption | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /** Where this surface sends a venue with no free slots. */
  onAddAvailability?: () => void;
}

/** What the chosen slot pays the venue — or why it cannot be chosen. */
function SlotEarnings({
  slot,
  labels,
  formatMoney,
}: Readonly<{ slot: AutoPodVenueSlot | null; labels: AutoPodLabels; formatMoney: (amount: number) => string }>) {
  if (!slot) return null;
  if (!slot.viable) return <Alert severity="warning">{labels.slotNotViable}</Alert>;
  return (
    <Alert severity="success" data-testid="auto-pod-slot-earning">
      {labels.potentialEarning(formatMoney(slot.venue_receives))}
    </Alert>
  );
}

/**
 * Accepting an Auto Pod and committing a slot are ONE step: an acceptance with
 * no date would leave hosts and club admins nothing to enrol against. The
 * venue is the one chosen at the top of the queue; the slots are its free ones
 * in the next few days (Pod Settings decides how many), nearest first, each
 * priced as the venue would be paid after Finance's deductions. The slot is
 * booked the instant this succeeds and stays booked until the pod exists.
 */
export function VenueAcceptDialog({
  row,
  venue,
  labels,
  open,
  onClose,
  onAccepted,
  formatWhen,
  formatMoney,
  onAddAvailability,
}: Readonly<VenueAcceptDialogProps>) {
  const [slotId, setSlotId] = useState('');
  const [failure, setFailure] = useState<string | null>(null);

  // A pinned offer only takes a venue from its own city — the server refuses
  // any other, so the dialog says so rather than listing slots it cannot use.
  const pinnedLocationId = row?.location?.location_id ?? null;
  const venueInCity = !!venue && (!pinnedLocationId || venue.location_id === pinnedLocationId);

  const slotsQuery = useQuery<VenueSlotsData>(AUTO_POD_VENUE_SLOTS, {
    variables: { auto_pod_doc_id: row?.id ?? '', venue_id: venue?.id ?? '' },
    skip: !open || !row || !venue || !venueInCity,
    fetchPolicy: 'network-only',
  });
  const payload = slotsQuery.data?.autoPodVenueSlots;
  const slots = payload?.slots ?? [];
  const selected = slots.find((slot) => slot.id === slotId) ?? null;

  const [accept, acceptState] = useMutation<any>(VENUE_ACCEPT_AUTO_POD);

  // A fresh offer, or a different venue, is a fresh choice.
  useEffect(() => {
    setSlotId('');
    setFailure(null);
  }, [row?.id, venue?.id]);

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  // What an accept would commit — only once an offer, a venue in the right
  // city and a slot the pod can cover are all in hand. The button is the only
  // way in, and it stays shut until then.
  const target =
    row && venue && venueInCity && selected?.viable && !acceptState.loading
      ? { autoPodId: row.id, venueId: venue.id, slotId: selected.id }
      : null;

  const acceptWith = async (chosen: NonNullable<typeof target>) => {
    setFailure(null);
    try {
      await accept({
        variables: { auto_pod_doc_id: chosen.autoPodId, venue_id: chosen.venueId, slot_id: chosen.slotId },
      });
      onAccepted();
      handleClose();
    } catch (err) {
      setFailure(enrolmentFailure(err, labels.claimedElsewhere));
    }
  };
  const handleAccept = target ? () => acceptWith(target) : undefined;

  const slotLabel = (slot: AutoPodVenueSlot) => {
    const space = slot.space_label ? ` · ${slot.space_label}` : '';
    return `${formatWhen(slot.start_at)}${space} · ${formatMoney(slot.price)}`;
  };
  const noSlots = venueInCity && !slotsQuery.loading && !!payload && slots.length === 0;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{labels.confirmAccept}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.confirmAcceptBody}
          </Typography>
          <VenueAcceptContext row={row} venue={venue} venueInCity={venueInCity} labels={labels} />

          <TextField
            select
            fullWidth
            label={labels.pickSlot}
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            disabled={!venueInCity || slots.length === 0}
            helperText={payload ? labels.slotWindow(payload.window_days) : undefined}
          >
            {slots.map((slot) => (
              <MenuItem key={slot.id} value={slot.id}>
                {slotLabel(slot)}
              </MenuItem>
            ))}
          </TextField>

          <SlotEarnings slot={selected} labels={labels} formatMoney={formatMoney} />

          {noSlots ? <NoSlotsNotice labels={labels} onAddAvailability={onAddAvailability} /> : null}

          {failure ? <Alert severity="error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={handleClose}>{labels.dismiss}</DuncitButton>
        <DuncitButton variant="contained" onClick={handleAccept} disabled={!handleAccept}>
          {labels.acceptCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
