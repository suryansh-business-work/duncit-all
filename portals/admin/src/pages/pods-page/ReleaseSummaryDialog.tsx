import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';

export interface ReleaseSummaryRelease {
  id: string;
  release_id: string;
  kind: 'HOST_PAYMENT' | 'VENUE_BILLING';
  status: string;
  amount_requested: number;
}

export interface ReleaseSummary {
  currency_symbol: string;
  releases: ReleaseSummaryRelease[];
}

const KIND_LABELS: Record<ReleaseSummaryRelease['kind'], string> = {
  HOST_PAYMENT: 'Host payout',
  VENUE_BILLING: 'Venue payout',
};

/** Shown after Complete-a-Pod submit: the pending payout releases created. */
export default function ReleaseSummaryDialog({
  summary,
  onClose,
}: Readonly<{ summary: ReleaseSummary | null; onClose: () => void }>) {
  return (
    <Dialog open={!!summary} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Pod submitted for Finance approval</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Payouts stay pending until Finance approves them.
        </Typography>
        <List dense disablePadding>
          {(summary?.releases ?? []).map((release) => (
            <ListItem key={release.id} disableGutters>
              <ListItemText
                primary={`${KIND_LABELS[release.kind] ?? release.kind} ${summary?.currency_symbol}${release.amount_requested.toFixed(2)} (${release.status})`}
                secondary={release.release_id}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
