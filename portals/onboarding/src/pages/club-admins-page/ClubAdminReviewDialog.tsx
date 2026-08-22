import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { InfoRow, StatusChip, type StatusColorMap } from '@duncit/ui';
import AssignClubsSection from './AssignClubsSection';
import { categoryPath, isActiveClubAdmin, type ClubAdminRow } from './queries';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  active: ClubAdminRow | null;
  notes: string;
  setNotes: (v: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSaveCommission: (commissionPct: number) => void;
  savingCommission: boolean;
  onAssignClubs: (clubIds: string[]) => void;
  savingClubs: boolean;
}

const STATUS_COLOR: StatusColorMap = {
  DRAFT: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

const dateLabel = (iso?: string | null) => (iso ? formatDate(iso) : '—');

export default function ClubAdminReviewDialog({
  active,
  notes,
  setNotes,
  onClose,
  onApprove,
  onReject,
  onSaveCommission,
  savingCommission,
  onAssignClubs,
  savingClubs,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [commission, setCommission] = useState('0');

  useEffect(() => {
    setCommission(String(active?.commission_pct ?? 0));
  }, [active]);

  const commissionValid = (() => {
    const n = Number(commission);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  })();

  if (!active) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <span>{t('onboarding.clubAdmins.reviewClubAdmin')}</span>
          <StatusChip status={active.status} colorMap={STATUS_COLOR} />
          <Typography variant="caption" color="text.secondary">
            {active.club_admin_no || '—'}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <InfoRow label={t('shell.common.name')} value={active.full_name || '—'} />
            <InfoRow label={t('shell.common.email')} value={active.email || '—'} />
            <InfoRow label={t('shell.common.phone')} value={active.phone || '—'} />
            <InfoRow label={t('onboarding.common.category')} value={categoryPath(active)} />
            <InfoRow
              label={t('onboarding.clubAdmins.assignedClubs')}
              value={active.assigned_clubs.map((c) => c.club_name).join(', ') || '—'}
            />
            <InfoRow label={t('shell.common.status')} value={isActiveClubAdmin(active) ? 'Active' : 'Inactive'} />
            <InfoRow label={t('onboarding.clubAdmins.dateJoined')} value={dateLabel(active.joined_at)} />
            <InfoRow label={t('onboarding.clubAdmins.request')} value={active.request_no || '—'} />
            {active.reviewer_notes && <InfoRow label={t('onboarding.clubAdmins.previousNotes')} value={active.reviewer_notes} />}
          </Paper>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Pay Commission
            </Typography>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                type="number"
                label={t('onboarding.common.commission')}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                error={!commissionValid}
                helperText={
                  commissionValid ? '0 inherits the platform default.' : 'Enter 0–100.'
                }
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                sx={{ width: 200 }}
              />
              <Button
                variant="outlined"
                disabled={!commissionValid || savingCommission}
                onClick={() => onSaveCommission(Number(commission))}
                sx={{ mt: 0.5 }}
              >
                {savingCommission ? 'Saving…' : 'Save commission'}
              </Button>
            </Stack>
          </Box>

          <Divider />

          <AssignClubsSection row={active} saving={savingClubs} onSave={onAssignClubs} />

          <Divider />

          <TextField
            label={t('onboarding.clubAdmins.reviewNotes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            helperText={t('onboarding.clubAdmins.requiredToRejectOptionalWhenApproving')}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
        <Button color="error" disabled={!notes.trim()} onClick={onReject}>
          Reject
        </Button>
        <Button variant="contained" onClick={onApprove}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
