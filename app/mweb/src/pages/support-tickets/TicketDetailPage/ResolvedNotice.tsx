import { Button, Paper, Stack, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';

interface Props {
  statusLabel: string;
  reopenable: boolean;
  reopenDeadline: string | null;
  reopening: boolean;
  formatDateTime: (iso: string) => string;
  onReopen: () => void;
}

/** Banner offering a reopen for a resolved/closed ticket within the window (B11). */
export default function ResolvedNotice({
  statusLabel,
  reopenable,
  reopenDeadline,
  reopening,
  formatDateTime,
  onReopen,
}: Readonly<Props>) {
  let windowNote: React.ReactNode;
  if (reopenable && reopenDeadline) {
    windowNote = (
      <Typography variant="caption" color="text.secondary">
        You can reopen this until {formatDateTime(reopenDeadline)}
      </Typography>
    );
  } else {
    windowNote = (
      <Typography variant="caption" color="text.secondary">
        The reopen window has passed — raise a new ticket if you still need help.
      </Typography>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            This ticket is {statusLabel}. Re-open it to continue.
          </Typography>
          {windowNote}
        </Stack>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ReplayIcon />}
          disabled={!reopenable || reopening}
          onClick={onReopen}
          sx={{ borderRadius: 99, fontWeight: 800, flexShrink: 0 }}
        >
          Re-open
        </Button>
      </Stack>
    </Paper>
  );
}
