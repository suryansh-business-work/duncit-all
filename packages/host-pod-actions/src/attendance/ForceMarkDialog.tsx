import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { joinPhone, type PodAttendanceLabels, type PodAttendanceRow } from '@duncit/utils';

interface Props {
  row: PodAttendanceRow | null;
  labels: PodAttendanceLabels;
  busy: boolean;
  onClose: () => void;
  onConfirm: (row: PodAttendanceRow) => void;
}

/**
 * The Club Admin's override, behind a warning.
 *
 * A forced mark writes attendance with no scan and no code behind it, and
 * attendance is what the host is paid on — so the one thing standing between
 * this button and a wrong payout is the person pressing it having checked. The
 * dialog therefore restates WHO is about to be marked (name and number) rather
 * than only asking "are you sure": a confirm with no subject is a confirm
 * people click through.
 */
export default function ForceMarkDialog({
  row,
  labels,
  busy,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const phone = row ? joinPhone(row.phone_extension, row.phone_number) : '';
  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{labels.forceTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Alert severity="warning" icon={<WarningAmberIcon />}>
            {labels.forceWarning}
          </Alert>
          <Stack spacing={0.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {row?.name}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {[phone, row?.email, row?.ticket_code].filter(Boolean).join(' · ')}
            </Typography>
            {!!row && row.seats > 1 && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {labels.seats(row.seats)}
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {labels.forceCancel}
        </Button>
        <Button
          variant="contained"
          color="warning"
          disabled={busy || !row}
          onClick={() => row && onConfirm(row)}
          sx={{ borderRadius: 999, fontWeight: 800 }}
        >
          {busy ? labels.marking : labels.forceConfirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
