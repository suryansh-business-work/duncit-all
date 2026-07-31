import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { SurveyAnswers } from '../../../components/survey-answers';
import HostReviewCategories from './HostReviewCategories';
import HostReviewCommission from './HostReviewCommission';
import HostReviewDetails from './HostReviewDetails';
import HostReviewDocuments from './HostReviewDocuments';
import type { HostRow } from '../queries';
import type { HostCategoryValue } from '../../../forms/host';

interface Props {
  active: HostRow | null;
  notes: string;
  setNotes: (v: string) => void;
  tagsText: string;
  setTagsText: (v: string) => void;
  saveError: string | null;
  dismissError: () => void;
  /** Finance → Default Deductions. Undefined until the query resolves — the
   * commission card waits for it so its field seeds from the real default. */
  defaultCommissionPct?: number;
  surveyCategory: HostCategoryValue | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSaveCommission: (pct: number) => Promise<boolean>;
  onSaveCategories: (categories: HostCategoryValue[]) => Promise<boolean>;
  savingCommission: boolean;
  savingCategories: boolean;
  deciding: boolean;
}

const STATUS_COLOR: StatusColorMap = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

export default function HostReviewDialog({
  active,
  notes,
  setNotes,
  tagsText,
  setTagsText,
  saveError,
  dismissError,
  defaultCommissionPct,
  surveyCategory,
  onClose,
  onApprove,
  onReject,
  onSaveCommission,
  onSaveCategories,
  savingCommission,
  savingCategories,
  deciding,
}: Readonly<Props>) {
  const { formatDateTime } = useDateFormat();
  // Nothing may leave the dialog mid-write: the commission and the categories
  // save without a button, so an escape here loses an edit silently.
  const busy = savingCommission || savingCategories || deciding;

  if (!active) return null;

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1 }}>
          Review host
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {active.full_name || 'Host'}
          </Typography>
          <StatusChip status={active.status} colorMap={STATUS_COLOR} sx={{ fontWeight: 800 }} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {saveError && (
            <Alert severity="error" onClose={dismissError}>
              {saveError}
            </Alert>
          )}

          <HostReviewDetails host={active} formatDateTime={formatDateTime} />

          <HostReviewDocuments
            passportUrl={active.passport_photo_url}
            policeVerificationUrl={active.police_verification_url}
          />

          <Divider textAlign="left">
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Earn with Duncit application
            </Typography>
          </Divider>
          <SurveyAnswers userId={active.user_id} kind="HOST" title="" />

          <HostReviewCategories
            categories={active.host_categories ?? []}
            surveyCategory={surveyCategory}
            saving={savingCategories}
            onChange={onSaveCategories}
          />

          {defaultCommissionPct !== undefined && (
            <HostReviewCommission
              // Re-seed per host: the field is uncontrolled after mount so a
              // saved 0 keeps showing 0 instead of snapping to the default.
              key={active.id}
              value={active.host_commission_pct ?? 0}
              defaultPct={defaultCommissionPct}
              saving={savingCommission}
              onSave={onSaveCommission}
            />
          )}

          <TextField
            label="Reviewer notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label="Tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText="Comma-separated tags applied when this host is approved."
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button color="error" variant="outlined" onClick={onReject} disabled={busy || !notes.trim()}>
          Reject
        </Button>
        <Button variant="contained" color="success" onClick={onApprove} disabled={busy}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
