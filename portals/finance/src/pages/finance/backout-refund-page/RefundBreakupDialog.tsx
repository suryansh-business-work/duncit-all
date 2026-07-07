import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { buildRefundBreakup, type BackoutRefundRequest } from './queries';

interface Props {
  refundFor: BackoutRefundRequest | null;
  sym: string;
  onClose: () => void;
  onConfirm: () => void;
}

/** Preview of a member's refund breakup. "Refund now" is a DUMMY — it calls the
 * page's onConfirm (which toasts + closes); no mutation runs yet. */
export default function RefundBreakupDialog({ refundFor, sym, onClose, onConfirm }: Readonly<Props>) {
  const lines = refundFor ? buildRefundBreakup(refundFor, sym) : [];

  return (
    <Dialog open={!!refundFor} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Refund breakup</DialogTitle>
      <DialogContent dividers>
        {refundFor && (
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Refund preview for <b>{refundFor.user_name ?? 'this member'}</b>.
            </Typography>
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
              <Stack spacing={0.5} divider={<Divider flexItem />}>
                {lines.map((line) => (
                  <Stack key={line.key} direction="row" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={line.bold ? 700 : 400}>{line.label}</Typography>
                    <Typography variant="body2" fontWeight={line.bold ? 700 : 400}>{line.value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Alert severity="info">
              This is a preview. Actual refund processing — including the backout deduction — ships later.
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="warning" variant="contained" onClick={onConfirm}>
          Refund now
        </Button>
      </DialogActions>
    </Dialog>
  );
}
