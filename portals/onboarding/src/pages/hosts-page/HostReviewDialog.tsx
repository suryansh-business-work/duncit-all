import { useEffect, useState } from 'react';
import {
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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { InfoRow, StatusChip, type StatusColorMap } from '@duncit/ui';
import HostReviewCategories from './HostReviewCategories';
import type { HostCategoryValue } from '../../forms/host';

interface Props {
  active: any;
  notes: string;
  setNotes: (v: string) => void;
  tagsText: string;
  setTagsText: (v: string) => void;
  onClose: () => void;
  /** Receives the dialog's current commission so approval persists what the
   * reviewer SAW (the 15% default included), not a value they never looked at. */
  onApprove: (commissionPct: number) => void;
  onReject: () => void;
  onSaveCommission: (commissionPct: number) => void;
  savingCommission: boolean;
  onSaveCategories: (categories: HostCategoryValue[]) => void;
  savingCategories: boolean;
}

const STATUS_COLOR: StatusColorMap = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

function DocButton({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Button
      size="small"
      variant="outlined"
      href={href}
      target="_blank"
      rel="noreferrer"
      startIcon={<OpenInNewIcon fontSize="small" />}
    >
      {label}
    </Button>
  );
}

export default function HostReviewDialog({
  active,
  notes,
  setNotes,
  tagsText,
  setTagsText,
  onClose,
  onApprove,
  onReject,
  onSaveCommission,
  savingCommission,
  onSaveCategories,
  savingCategories,
}: Readonly<Props>) {
  // 15% is the standard host commission a reviewer applies at onboarding.
  // `||` (not `??`) is deliberate: a stored 0 means "no override yet", so the
  // dialog re-seeds it to the 15% default rather than showing 0.
  const [commission, setCommission] = useState('15');
  useEffect(() => {
    setCommission(String(active?.host_commission_pct || 15));
  }, [active]);

  const commissionValid = (() => {
    const n = Number(commission);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  })();
  const saveCommission = () => {
    if (commissionValid) onSaveCommission(Number(commission));
  };

  const hasDocs = !!(active?.passport_photo_url || active?.police_verification_url);
  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', lineHeight: 1 }}>
          Review host
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={900} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {active?.full_name || 'Host'}
          </Typography>
          {active?.status && (
            <StatusChip status={active.status} colorMap={STATUS_COLOR} sx={{ fontWeight: 800 }} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack spacing={0.75}>
            <InfoRow variant="inline" labelWidth={80} label="Aadhar" value={active?.aadhar_number || '—'} />
            <InfoRow variant="inline" labelWidth={80} label="PAN" value={active?.pan_number || '—'} />
            <InfoRow variant="inline" labelWidth={80} label="DOB" value={active?.dob?.slice(0, 10) || '—'} />
            <InfoRow variant="inline" labelWidth={80} label="Address" value={active?.full_address || '—'} />
          </Stack>

          {hasDocs && (
            <>
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">Documents</Typography>
              </Divider>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {active?.passport_photo_url && <DocButton href={active.passport_photo_url} label="Passport photo" />}
                {active?.police_verification_url && <DocButton href={active.police_verification_url} label="Police verification" />}
              </Stack>
            </>
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

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={800}>
              Host commission
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              The commission Duncit takes from this host&apos;s payouts. Defaults to 15%. Set 0 to
              inherit the global default.
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
              <TextField
                label="Commission from host"
                type="number"
                size="small"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                error={!commissionValid}
                helperText="Defaults to 15%. 0 = inherit default."
                inputProps={{ min: 0, max: 100, step: 1, 'aria-label': 'Host commission percentage' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                sx={{ maxWidth: 220 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={saveCommission}
                disabled={savingCommission || !commissionValid}
              >
                {savingCommission ? 'Saving…' : 'Save commission'}
              </Button>
            </Stack>
          </Paper>

          <HostReviewCategories
            // Remount per host so local edit state never leaks across rows.
            key={active?.id ?? 'none'}
            categories={(active?.host_categories ?? []) as HostCategoryValue[]}
            onSave={onSaveCategories}
            saving={savingCategories}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button color="error" variant="outlined" onClick={onReject} disabled={!notes.trim()}>
          Reject
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => onApprove(commissionValid ? Number(commission) : 15)}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
