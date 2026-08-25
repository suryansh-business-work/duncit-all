import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AutoPodRow, AutoPodLabels } from '@duncit/utils';
import {
  MY_VENUES_FOR_AUTO_POD,
  VENUE_ACCEPT_AUTO_POD,
  VENUE_AVAILABLE_SLOTS_FOR_AUTO_POD,
} from '../queries';

interface VenueOption {
  id: string;
  venue_name: string;
  status: string;
  is_active: boolean;
}

interface SlotOption {
  id: string;
  start_at: string;
  end_at: string;
  whole_day: boolean;
  price: number;
  space_label: string;
}

export interface VenueAcceptDialogProps {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /** Where this surface sends a venue with no free slots. */
  onAddAvailability?: () => void;
}

/**
 * Accepting an Auto Pod and committing a slot are ONE step: an acceptance with
 * no date would leave hosts and club admins nothing to enrol against. The venue
 * picks from slots it has already published — the slot is booked the instant
 * this succeeds and stays booked until the pod exists.
 */
export function VenueAcceptDialog({
  row,
  labels,
  open,
  onClose,
  onAccepted,
  formatWhen,
  formatMoney,
  onAddAvailability,
}: Readonly<VenueAcceptDialogProps>) {
  const [venueId, setVenueId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [failure, setFailure] = useState<string | null>(null);

  const venuesQuery = useQuery<{ myVenues: VenueOption[] }>(MY_VENUES_FOR_AUTO_POD, { skip: !open });
  const venues = (venuesQuery.data?.myVenues ?? []).filter(
    (v) => v.status === 'APPROVED' && v.is_active
  );

  const slotsQuery = useQuery<{ venueAvailableSlots: SlotOption[] }>(
    VENUE_AVAILABLE_SLOTS_FOR_AUTO_POD,
    { variables: { venue_id: venueId }, skip: !open || !venueId }
  );
  const slots = slotsQuery.data?.venueAvailableSlots ?? [];

  const [accept, acceptState] = useMutation(VENUE_ACCEPT_AUTO_POD);

  // Preselect the only venue there is, and clear a slot that belongs to the
  // venue the owner just switched away from.
  useEffect(() => {
    if (!venueId && venues.length === 1) setVenueId(venues[0].id);
  }, [venueId, venues]);
  useEffect(() => {
    setSlotId('');
  }, [venueId]);

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  const handleAccept = async () => {
    if (!row || !venueId || !slotId) return;
    setFailure(null);
    try {
      await accept({ variables: { auto_pod_doc_id: row.id, venue_id: venueId, slot_id: slotId } });
      onAccepted();
      handleClose();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : labels.claimedElsewhere);
    }
  };

  const slotLabel = (slot: SlotOption) => {
    const when = slot.whole_day ? formatWhen(slot.start_at) : `${formatWhen(slot.start_at)}`;
    const space = slot.space_label ? ` · ${slot.space_label}` : '';
    return `${when}${space} · ${formatMoney(slot.price)}`;
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{labels.confirmAccept}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {labels.confirmAcceptBody}
          </Typography>
          {row ? (
            <Typography variant="subtitle2">{row.pod_title}</Typography>
          ) : null}

          <TextField
            select
            fullWidth
            label={labels.pickVenue}
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
          >
            {venues.map((venue) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.venue_name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label={labels.pickSlot}
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            disabled={!venueId || slots.length === 0}
          >
            {slots.map((slot) => (
              <MenuItem key={slot.id} value={slot.id}>
                {slotLabel(slot)}
              </MenuItem>
            ))}
          </TextField>

          {venueId && !slotsQuery.loading && slots.length === 0 ? (
            <Alert
              severity="info"
              action={
                onAddAvailability ? (
                  <Button color="inherit" size="small" onClick={onAddAvailability}>
                    {labels.addAvailability}
                  </Button>
                ) : undefined
              }
            >
              {labels.noSlots}
            </Alert>
          ) : null}

          {failure ? <Alert severity="error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{labels.dismiss}</Button>
        <Button
          variant="contained"
          onClick={handleAccept}
          disabled={!venueId || !slotId || acceptState.loading}
        >
          {labels.acceptCta}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
