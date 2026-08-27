import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

export interface ReleaseSummaryRelease {
  id: string;
  release_id: string;
  kind: 'HOST_PAYMENT' | 'VENUE_BILLING' | 'CLUB_ADMIN' | 'ECOMM_PAYMENT';
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
  CLUB_ADMIN: 'Club admin payout',
  ECOMM_PAYMENT: 'Product sales payout',
};

/** Shown after Complete-a-Pod submit: the payout releases created + credited. */
export default function ReleaseSummaryDialog({
  summary,
  onClose,
}: Readonly<{ summary: ReleaseSummary | null; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!summary} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('admin.completePod.released')}</DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1
          }}>
          Each payout below has been credited to its beneficiary&apos;s wallet.
        </Typography>
        <List dense disablePadding>
          {(summary?.releases ?? []).map((release) => (
            <ListItem key={release.id} disableGutters>
              <ListItemText
                primary={`${KIND_LABELS[release.kind] ?? release.kind} ${summary?.currency_symbol}${release.amount_requested.toFixed(2)} (${release.status})`}
                secondary={release.release_id}
                slotProps={{
                  primary: { variant: 'body2', sx: { fontWeight: 700 } },
                  secondary: { variant: 'caption' }
                }} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} variant="contained">
          Done
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
