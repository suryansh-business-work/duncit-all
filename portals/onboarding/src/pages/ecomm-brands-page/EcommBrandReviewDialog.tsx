import { useEffect, useRef, useState } from 'react';
import { Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, InputAdornment, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow, StatusChip, type StatusColorMap } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  active: any;
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
          <Typography
            variant="h6"
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
          {active?.cover_image_url && (
            <Box
              component="img"
              src={active.cover_image_url}
              alt={active.brand_name}
              sx={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 1.5 }}
            />
          )}
          {active?.tagline && <Typography variant="body2" sx={{
            fontStyle: "italic"
          }}>{active.tagline}</Typography>}
          <InfoRow label={t('shell.common.description')} value={active?.description || '—'} />
          <InfoRow label={t('shell.nav.categories')} value={(active?.product_categories ?? []).join(', ') || '—'} />
          <InfoRow label={t('onboarding.common.owner')} value={[active?.contact_person, active?.contact_email, active?.contact_phone].filter(Boolean).join(' · ') || '—'} />
          <InfoRow label={t('onboarding.ecommBrands.businessAndLegal')} value={business || '—'} />
          <InfoRow label={t('onboarding.common.address')} value={address || '—'} />
          {(active?.website_url || active?.instagram_url) && (
            <Stack direction="row" spacing={2} sx={{
              flexWrap: "wrap"
            }}>
              {active?.website_url && <Link href={active.website_url} target="_blank" rel="noreferrer" variant="body2">{t('onboarding.ecommBrands.website')}</Link>}
              {active?.instagram_url && <Link href={active.instagram_url} target="_blank" rel="noreferrer" variant="body2">{t('onboarding.ecommBrands.instagram')}</Link>}
            </Stack>
          )}
          {bank && <InfoRow label={t('onboarding.common.payout')} value={bank} />}
          {documents.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700
                }}>{t('shell.nav.documents')}</Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  flexWrap: "wrap",
                  rowGap: 1,
                  mt: 0.5
                }}>
                {documents.map((doc: any) => (
                  <Chip key={doc.url} size="small" component={Link} href={doc.url} target="_blank" rel="noreferrer" clickable label={doc.type} variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          <Divider />
          <TextField label={t('onboarding.common.reviewerNotes')} value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
          <TextField
            label={t('onboarding.common.tags')}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText={t('onboarding.ecommBrands.commaSeparatedTagsForThisApproved')}
            fullWidth
          />

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 800
            }}>
              {t('onboarding.ecommBrands.productSalesCommission')}
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('onboarding.ecommBrands.productSalesCommissionHint', {
                vars: { pct: defaultCommissionPct ?? '—' },
              })}
            </Typography>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: "center",
                mt: 1.5
              }}>
              <TextField
                label={t('onboarding.ecommBrands.productSalesCommission')}
                type="number"
                size="small"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                error={!commissionValid}
                helperText={commissionValid ? undefined : t('onboarding.common.commissionRange')}
                fullWidth
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                  htmlInput: { min: 0, max: 100, step: 1, 'aria-label': 'Product sales commission percentage' }
                }} />
              <DuncitButton
                variant="outlined"
                size="small"
                onClick={saveCommission}
                disabled={savingCommission || !commissionValid || unchanged}
                sx={{ whiteSpace: 'nowrap', mb: 2.5 }}
              >
                {savingCommission ? 'Saving…' : 'Save commission'}
              </DuncitButton>
            </Stack>
          </Paper>
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
