import { useEffect, useRef, useState } from 'react';
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
import { BrandDetails } from './BrandDetails';
import { CommissionPanel } from './CommissionPanel';
import type { ReviewBrand } from './types';

interface Props {
  active: ReviewBrand;
  notes: string;
  setNotes: (v: string) => void;
  tagsText: string;
  setTagsText: (v: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSaveCommission: (commissionPct: number) => void;
  savingCommission: boolean;
  /** Finance → Default Deductions. Undefined until the query resolves — the
   * commission field waits for it rather than seeding a misleading 0. */
  defaultCommissionPct?: number;
}

const STATUS_COLOR: StatusColorMap = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

export default function EcommBrandReviewDialog({
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
  defaultCommissionPct,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [commission, setCommission] = useState('');
  // What this brand's sales are charged today: its own override, or — because a
  // stored 0 means "follow the global default" — Finance → Default Deductions.
  const storedPct = Number(active?.product_commission_pct ?? 0);
  const effectivePct = storedPct > 0 ? storedPct : defaultCommissionPct;

  // Seed once per brand. Reseeding on every `active` identity change would wipe
  // what the reviewer is typing when the parent merges a saved value back in.
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
  // brand to today's number — cutting it out of every future change in Finance →
  // Default Deductions. So saving is only offered once it actually moves.
  const unchanged = commissionValid && Number(commission) === effectivePct;
  const saveCommission = () => {
    if (commissionValid) onSaveCommission(Number(commission));
  };

  const documents = active?.documents ?? [];
  const address = [active?.address_line1, active?.city, active?.state, active?.postal_code, active?.country]
    .filter(Boolean)
    .join(', ');
  const business = [
    active?.registered_business_name && `Business: ${active.registered_business_name}`,
    active?.gstin && `GSTIN: ${active.gstin}`,
    active?.pan && `PAN: ${active.pan}`,
    active?.established_year && `Est. ${active.established_year}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const bank = [
    active?.account_holder_name,
    active?.account_number,
    active?.ifsc_code,
    active?.upi_id,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 800,
            display: 'block',
            lineHeight: 1
          }}>
          Review brand
        </Typography>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          {/* A span: DialogTitle is already the dialog's <h2>. */}
          <Typography
            variant="h6"
            component="span"
            noWrap
            sx={{
              fontWeight: 900,
              flex: 1,
              minWidth: 0
            }}>
            {active?.brand_name || 'Brand'}
          </Typography>
          {active?.status && (
            <StatusChip status={active.status} colorMap={STATUS_COLOR} sx={{ fontWeight: 800 }} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.75}>
          <BrandDetails active={active} documents={documents} address={address} business={business} bank={bank} />

          <Divider />
          <TextField label={t('onboarding.common.reviewerNotes')} value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
          <TextField
            label={t('onboarding.common.tags')}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText={t('onboarding.ecommBrands.commaSeparatedTagsForThisApproved')}
            fullWidth
          />

          <CommissionPanel
            commission={commission}
            setCommission={setCommission}
            commissionValid={commissionValid}
            unchanged={unchanged}
            saveCommission={saveCommission}
            savingCommission={savingCommission}
            defaultCommissionPct={defaultCommissionPct}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
        <Box sx={{ flex: 1 }} />
        <DuncitButton color="error" variant="outlined" onClick={onReject} disabled={!notes.trim()}>
          Reject
        </DuncitButton>
        <DuncitButton variant="contained" color="success" onClick={onApprove}>
          Approve
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
