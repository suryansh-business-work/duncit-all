import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { WindowOfferForm, windowOfferDefaults, type WindowOfferInput } from '@duncit/availability-calendar';
import { DuncitButton } from '@duncit/buttons';
import type { AutoPodRow, AutoPodLabels } from '@duncit/utils';
import { VENUE_ACCEPT_AUTO_POD, autoPodVenueQuoteSource, autoPodVenueOffer } from '../../queries';
import { enrolmentFailure } from '../../failure-message';
import type { AutoPodVenueOption } from '../AutoPodVenuePicker';
import { VenueAcceptContext } from '../VenueAcceptSections';

export interface VenueAcceptDialogProps {
  row: AutoPodRow | null;
  /** The venue chosen at the top of the queue — the one this accept commits. */
  venue: AutoPodVenueOption | null;
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

/**
 * Accepting an Auto Pod and fixing its time are ONE step: an acceptance with no
 * date would leave hosts and club admins nothing to enrol against. The venue
 * (chosen at the top of the queue) proposes a time inside its opening hours and
 * how it is paid; the server prices it (its charges, Duncit's commission on
 * top) and books it, price frozen, the instant this succeeds. The guests are
 * the offer's spots.
 */
export function VenueAcceptDialog({ row, venue, labels, open, onClose, onAccepted }: Readonly<VenueAcceptDialogProps>) {
  const [failure, setFailure] = useState<string | null>(null);
  const [accept, acceptState] = useMutation(VENUE_ACCEPT_AUTO_POD);

  // A pinned offer only takes a venue from its own city — the server refuses
  // any other, so the dialog says so rather than offering a time it cannot use.
  const pinnedLocationId = row?.location?.location_id ?? null;
  const venueInCity = !!venue && (!pinnedLocationId || venue.location_id === pinnedLocationId);
  const formId = `auto-pod-venue-accept-${row?.id ?? 'none'}`;
  const quote = useMemo(() => autoPodVenueQuoteSource(row?.id ?? '', venue?.id ?? ''), [row?.id, venue?.id]);
  const defaults = useMemo(() => windowOfferDefaults(), []);

  // A fresh offer, or a different venue, is a fresh choice.
  useEffect(() => {
    setFailure(null);
  }, [row?.id, venue?.id]);

  const handleClose = () => {
    setFailure(null);
    onClose();
  };

  const acceptWith = async (autoPodId: string, venueId: string, offer: WindowOfferInput) => {
    setFailure(null);
    try {
      await accept({ variables: { auto_pod_doc_id: autoPodId, venue_id: venueId, offer: autoPodVenueOffer(offer) } });
      onAccepted();
      handleClose();
    } catch (err) {
      setFailure(enrolmentFailure(err, labels.claimedElsewhere));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} data-testid="auto-pod-venue-accept-dialog" fullWidth maxWidth="sm">
      <DialogTitle>{labels.confirmAccept}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {labels.confirmAcceptBody}
          </Typography>
          <VenueAcceptContext row={row} venue={venue} venueInCity={venueInCity} labels={labels} />
          {row && venue && venueInCity ? (
            <WindowOfferForm
              key={formId}
              formId={formId}
              defaultValues={defaults}
              quote={quote}
              onSubmit={(offer) => acceptWith(row.id, venue.id, offer)}
            />
          ) : null}
          {failure ? <Alert severity="error" data-testid="auto-pod-venue-accept-error">{failure}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={handleClose} data-testid="auto-pod-venue-accept-dismiss">{labels.dismiss}</DuncitButton>
        <DuncitButton
          type="submit"
          form={formId}
          variant="contained"
          disabled={!row || !venueInCity}
          loading={acceptState.loading}
          data-testid="auto-pod-venue-accept-confirm"
        >
          {labels.acceptCta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
