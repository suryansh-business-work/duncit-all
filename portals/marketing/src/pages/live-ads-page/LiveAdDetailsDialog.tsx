import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import ReviewDetails from '../ads-approvals-page/ReviewDetails';
import { AD_STATUS_CHIP_COLORS, type AdRequestRow } from '../ads-approvals-page/helpers';

interface Props {
  ad: AdRequestRow | null;
  busy: boolean;
  formatDateTime: (s: string) => string;
  onClose: () => void;
  onStop: (ad: AdRequestRow) => void;
  onDelete: (ad: AdRequestRow) => void;
}

/**
 * Everything about one running ad, opened from its row. Reuses the approval
 * queue's detail block so a live ad is described exactly the way it was
 * reviewed, and puts Stop and Delete where you are already looking at it.
 */
export default function LiveAdDetailsDialog({
  ad,
  busy,
  formatDateTime,
  onClose,
  onStop,
  onDelete,
}: Readonly<Props>) {
  if (!ad) return null;

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 800,
            display: 'block',
            lineHeight: 1
          }}>
          {ad.trace_id}
        </Typography>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 900,
              flex: 1,
              minWidth: 0
            }}>
            {ad.ad_title}
          </Typography>
          <StatusChip status={ad.status} colorMap={AD_STATUS_CHIP_COLORS} sx={{ fontWeight: 800 }} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <ReviewDetails request={ad} formatDateTime={formatDateTime} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <DuncitButton onClick={onClose} disabled={busy}>
          Close
        </DuncitButton>
        <DuncitButton
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => onDelete(ad)}
          disabled={busy}
        >
          Delete
        </DuncitButton>
        <DuncitButton
          variant="contained"
          color="warning"
          startIcon={<StopCircleIcon />}
          onClick={() => onStop(ad)}
          disabled={busy}
        >
          Stop ad
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
