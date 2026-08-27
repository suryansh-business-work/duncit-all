import { useEffect, useRef, useState } from 'react';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow, StatusChip, type StatusColorMap } from '@duncit/ui';
import AssignClubsSection from './AssignClubsSection';
import { categoryPath, isActiveClubAdmin, type ClubAdminRow } from './queries';
import { formatDate, useTranslation } from '@duncit/app-settings';

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
  /** Finance → Default Deductions. Undefined until the query resolves — the
   * commission field waits for it rather than seeding a misleading 0. */
  defaultCommissionPct?: number;
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
  defaultCommissionPct,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [commission, setCommission] = useState('');
  // What this Club Admin is paid today: their own override, or — because a
  // stored 0/null means "follow the global default" — Finance → Default
  // Deductions.
  const storedPct = Number(active?.commission_pct ?? 0);
  const effectivePct = storedPct > 0 ? storedPct : defaultCommissionPct;

  // Seed once per Club Admin. Reseeding on every `active` identity change would
  // wipe what the reviewer is typing when the parent merges a saved value back in.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!active?.id) {
      seededFor.current = null;
      return;
    }
    if (seededFor.current === active.id || effectivePct === undefined) return;
    seededFor.current = active.id;
    setCommission(String(effectivePct));
  }, [active, effectivePct]);

  const commissionValid = (() => {
    const n = Number(commission);
    return commission.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
  })();
  // An untouched field holds the finance default, and saving that would pin this
  // Club Admin to today's number — cutting them out of every future change in
  // Finance → Default Deductions. So saving is only offered once it actually moves.
  const unchanged = commissionValid && Number(commission) === effectivePct;

  if (!active) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <span>{t('onboarding.clubAdmins.reviewClubAdmin')}</span>
          <StatusChip status={active.status} colorMap={STATUS_COLOR} />
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
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
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 0.5
              }}>
              {t('onboarding.clubAdmins.payCommission2')}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block',
                mb: 1
              }}>
              {t('onboarding.clubAdmins.payCommissionHint', {
                vars: { pct: defaultCommissionPct ?? '—' },
              })}
            </Typography>
            <Stack direction="row" spacing={1} sx={{
              alignItems: "flex-start"
            }}>
              <TextField
                size="small"
                type="number"
                label={t('onboarding.common.commission')}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                error={!commissionValid}
                helperText={commissionValid ? undefined : t('onboarding.common.commissionRange')}
                sx={{ width: 200 }}
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                  htmlInput: { min: 0, max: 100, step: 1 }
                }} />
              <DuncitButton
                variant="outlined"
                disabled={!commissionValid || unchanged || savingCommission}
                onClick={() => onSaveCommission(Number(commission))}
                sx={{ mt: 0.5 }}
              >
                {savingCommission ? 'Saving…' : 'Save commission'}
              </DuncitButton>
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
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
        <DuncitButton color="error" disabled={!notes.trim()} onClick={onReject}>
          Reject
        </DuncitButton>
        <DuncitButton variant="contained" onClick={onApprove}>
          Approve
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
