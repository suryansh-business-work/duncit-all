import { Alert, Button, Stack, Typography } from '@mui/material';

interface Props {
  /** True while the released seat has not been rebooked (restore still possible). */
  canCancel: boolean;
  busy: boolean;
  onKeepSpot: () => void;
}

/**
 * Pod detail panel state while the viewer's booking is in "Backout in process":
 * the seat is released, a replacement is being searched, and the booking can be
 * restored via "Keep My Spot" until the seat is rebooked.
 */
export default function BackoutInProcessPanel({ canCancel, busy, onKeepSpot }: Readonly<Props>) {
  if (!canCancel) {
    return (
      <Alert severity="info">
        A replacement has been confirmed — this Backout request can no longer be cancelled. Your
        refund will be processed as per the backout policy.
      </Alert>
    );
  }
  return (
    <Stack spacing={1}>
      <Alert severity="warning">
        <b>Backout in process.</b> We are searching for a replacement — you will get the refund
        only if someone fills your spot.
      </Alert>
      <Button variant="contained" onClick={onKeepSpot} disabled={busy} sx={{ fontWeight: 900 }}>
        Keep My Spot
      </Button>
      <Typography variant="caption" color="text.secondary">
        Changed your mind? Keep your spot to stop the replacement search and restore your booking.
      </Typography>
    </Stack>
  );
}
