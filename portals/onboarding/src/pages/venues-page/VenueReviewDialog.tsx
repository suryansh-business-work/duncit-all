import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import VenueReviewSummary from './VenueReviewSummary';
import VenueSettingsPanels from './VenueSettingsPanels';

interface Props {
  active: any;
  notes: string;
  setNotes: (v: string) => void;
  tagsText: string;
  setTagsText: (v: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  /** Refresh the table once a settings panel has saved. */
  onSaved: () => void;
}

const STATUS_COLOR: StatusColorMap = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

export default function VenueReviewDialog({
  active,
  notes,
  setNotes,
  tagsText,
  setTagsText,
  onClose,
  onApprove,
  onReject,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm" data-testid="venue-review-dialog">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 800,
            display: 'block',
            lineHeight: 1
          }}>
          Review venue
        </Typography>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Typography
            variant="h6"
            component="span"
            noWrap
            sx={{
              fontWeight: 900,
              flex: 1,
              minWidth: 0
            }}>
            <span data-testid="venue-review-name">{active?.venue_name || 'Venue'}</span>
          </Typography>
          {active?.status && (
            <StatusChip status={active.status} colorMap={STATUS_COLOR} sx={{ fontWeight: 800 }} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <VenueReviewSummary active={active} />

          <TextField label={t('onboarding.common.reviewerNotes')} value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} fullWidth data-testid="venue-review-notes" />
          <TextField
            label={t('onboarding.common.tags')}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText={t('onboarding.venues.commaSeparatedTagsForThisApproved')}
            fullWidth
          />

          <VenueSettingsPanels venue={active} onSaved={onSaved} />
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <DuncitButton onClick={onClose} data-testid="venue-review-close">{t('shell.common.close')}</DuncitButton>
        <Box sx={{ flex: 1 }} />
        <DuncitButton color="error" variant="outlined" onClick={onReject} disabled={!notes.trim()} data-testid="venue-review-reject">
          Reject
        </DuncitButton>
        <DuncitButton variant="contained" color="success" onClick={onApprove}>
          Approve
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
