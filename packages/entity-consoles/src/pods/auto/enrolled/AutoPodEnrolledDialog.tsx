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
import type { AutoPodLabels, AutoPodRole } from '@duncit/utils';
import ClubDetailsBody from './ClubDetailsBody';
import HostDetailsBody from './HostDetailsBody';
import VenueDetailsBody from './VenueDetailsBody';
import type { AutoPodTableRow } from '../queries';

export interface AutoPodEnrolledDialogProps {
  /** The row whose green dot was clicked — always one that partner has enrolled in. */
  row: AutoPodTableRow;
  role: AutoPodRole;
  onClose: () => void;
  t: (key: string) => string;
  labels: AutoPodLabels;
  formatDateTime: (value: string) => string;
}

const TITLE_KEY: Record<AutoPodRole, string> = {
  venue: 'admin.autoPods.venueDetailsTitle',
  host: 'admin.autoPods.hostDetailsTitle',
  club: 'admin.autoPods.clubDetailsTitle',
};

/**
 * Who took one place on an Auto Pod: the venue, the host or the club admin
 * behind a green dot on the dependency line — their name, how to reach them
 * and where they are. Each body reads its own partner on open; the shell is
 * shared so the three read identically.
 */
export default function AutoPodEnrolledDialog({
  row,
  role,
  onClose,
  t,
  labels,
  formatDateTime,
}: Readonly<AutoPodEnrolledDialogProps>) {
  let body = <VenueDetailsBody row={row} t={t} formatDateTime={formatDateTime} />;
  if (role === 'host') body = <HostDetailsBody row={row} t={t} formatDateTime={formatDateTime} />;
  else if (role === 'club') body = <ClubDetailsBody row={row} t={t} formatDateTime={formatDateTime} />;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" data-testid={`auto-pod-${role}-details`}>
      <DialogTitle>{t(TITLE_KEY[role])}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {body}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{labels.dismiss}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

/** The loading / failed / empty states each body shares. */
export function DetailsState({
  loading,
  failed,
}: Readonly<{ loading: boolean; failed: string | null }>) {
  return (
    <>
      {loading ? <CircularProgress size={20} /> : null}
      {failed ? <Alert severity="error">{failed}</Alert> : null}
    </>
  );
}

/** The partner's own name, above their details. */
export function DetailsHeading({ name }: Readonly<{ name: string }>) {
  return <Typography variant="subtitle2">{name}</Typography>;
}
