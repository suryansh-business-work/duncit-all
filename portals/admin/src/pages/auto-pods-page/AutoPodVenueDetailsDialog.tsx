import { useQuery } from '@apollo/client/react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney, type AutoPodLabels } from '@duncit/utils';
import { AUTO_POD_VENUE_DETAILS, type AutoPodTableRow, type AutoPodVenueDetails } from './queries';

interface Props {
  /** The row whose green Venue dot was clicked — always one with a venue on it. */
  row: AutoPodTableRow;
  onClose: () => void;
  t: (key: string) => string;
  labels: AutoPodLabels;
  formatDateTime: (value: string) => string;
}

interface DetailsData {
  venue: AutoPodVenueDetails | null;
}

function DetailLine({ label, value }: Readonly<{ label: string; value: string }>) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1.5}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 96, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

/**
 * The venue behind a green Venue dot on the admin's dependency line: who runs
 * it, how to reach them, where it is and what it holds — plus the slot it
 * committed to this offer and what that slot is priced at. The venue itself
 * is read on open (`venue(venue_doc_id)`); the slot comes off the row.
 */
export default function AutoPodVenueDetailsDialog({
  row,
  onClose,
  t,
  labels,
  formatDateTime,
}: Readonly<Props>) {
  const claim = row.venue_claim;
  const { data, loading, error } = useQuery<DetailsData>(AUTO_POD_VENUE_DETAILS, {
    variables: { venue_doc_id: claim?.venue_id ?? '' },
    skip: !claim,
  });
  const venue = data?.venue ?? null;
  const address = venue
    ? [venue.address_line1, venue.address_line2, venue.locality, venue.city, venue.state]
        .filter(Boolean)
        .join(', ')
    : '';
  const slotEnd = claim?.pod_end_date_time ? formatDateTime(claim.pod_end_date_time) : '';
  const slot = claim ? [formatDateTime(claim.pod_date_time), slotEnd].filter(Boolean).join(' – ') : '';

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" data-testid="auto-pod-venue-details">
      <DialogTitle>{t('admin.autoPods.venueDetailsTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Typography variant="subtitle2">{claim?.venue_name ?? ''}</Typography>
          {loading ? <CircularProgress size={20} /> : null}
          {error ? <Alert severity="error">{t('admin.autoPods.venueDetailsFailed')}</Alert> : null}
          {venue ? (
            <>
              <DetailLine label={t('admin.autoPods.venueOwner')} value={venue.owner_name} />
              <DetailLine label={t('admin.autoPods.venueEmail')} value={venue.owner_email} />
              <DetailLine label={t('admin.autoPods.venuePhone')} value={venue.owner_phone} />
              <DetailLine label={t('admin.autoPods.venueAddress')} value={address} />
              <DetailLine
                label={t('admin.autoPods.venueCapacity')}
                value={venue.capacity > 0 ? String(venue.capacity) : ''}
              />
            </>
          ) : null}
          <DetailLine label={t('admin.autoPods.venueSlot')} value={slot} />
          <DetailLine
            label={t('admin.autoPods.venueSlotPrice')}
            value={claim ? formatMoney(claim.slot_price) : ''}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{labels.dismiss}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
