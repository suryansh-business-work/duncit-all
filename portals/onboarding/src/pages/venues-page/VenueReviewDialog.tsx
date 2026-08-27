import { useEffect, useRef, useState } from 'react';
import { Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, InputAdornment, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
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
  onSaveDeductions: (sharePct: number, commissionPct: number) => void;
  savingDeductions: boolean;
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

export default function VenueReviewDialog({
  active,
  notes,
  setNotes,
  tagsText,
  setTagsText,
  onClose,
  onApprove,
  onReject,
  onSaveDeductions,
  savingDeductions,
  defaultCommissionPct,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [commission, setCommission] = useState('');
  // What settlement applies today: the venue's own override, or — because a
  // stored 0 means "follow the global default" — Finance → Default Deductions.
  const storedPct = Number(active?.venue_commission_pct ?? 0);
  const effectivePct = storedPct > 0 ? storedPct : defaultCommissionPct;

  // Seed once per venue. Reseeding on every `active` identity change would wipe
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

  const valid = (v: string) => {
    const n = Number(v);
    return v.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
  };
  // An untouched field holds the finance default, and saving that would pin this
  // venue to today's number — cutting it out of every future change in Finance →
  // Default Deductions. So saving is only offered once the number actually moves.
  const unchanged = valid(commission) && Number(commission) === effectivePct;
  const saveDeductions = () => {
    // Venue share is no longer edited here — keep whatever the venue already has
    // and only override the per-venue commission (the default-deduction override).
    if (valid(commission)) onSaveDeductions(Number(active?.venue_share_pct ?? 0), Number(commission));
  };

  const documents = active?.documents ?? [];
  const capacityItems = active?.capacity_items ?? [];
  const locationLine =
    [active?.locality, active?.city, active?.state, active?.country].filter(Boolean).join(', ') || '—';
  const categoryPath = [
    active?.venue_category?.super_category_name,
    active?.venue_category?.category_name,
    active?.venue_category?.sub_category_name,
  ]
    .filter(Boolean)
    .join(' › ');

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
          Review venue
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
            {active?.venue_name || 'Venue'}
          </Typography>
          {active?.status && (
            <StatusChip status={active.status} colorMap={STATUS_COLOR} sx={{ fontWeight: 800 }} />
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexWrap: "wrap",
                rowGap: 1,
                mb: 1
              }}>
              {active?.venue_type && <Chip size="small" variant="outlined" label={active.venue_type} />}
              {typeof active?.capacity === 'number' && (
                <Chip size="small" variant="outlined" label={`Capacity ${active.capacity}`} />
              )}
              <Chip size="small" variant="outlined" label={`GSTIN ${active?.gstin || '—'}`} />
              <Chip size="small" variant="outlined" label={`PAN ${active?.pan || '—'}`} />
            </Stack>
            {categoryPath && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Hosts in: <strong>{categoryPath}</strong>
              </Typography>
            )}
            {capacityItems.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  flexWrap: "wrap",
                  rowGap: 1,
                  mb: 1
                }}>
                {capacityItems.map((item: any) => (
                  <Chip key={item.label} size="small" label={`${item.label}: ${item.capacity}`} />
                ))}
              </Stack>
            )}
            <Typography variant="body2">
              {locationLine}
              {active?.postal_code ? ` · PIN ${active.postal_code}` : ''}
            </Typography>
          </Paper>

          {documents.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: "text.secondary",
                  fontWeight: 800
                }}>
                Documents
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  flexWrap: "wrap",
                  rowGap: 1,
                  mt: 0.5
                }}>
                {documents.map((doc: any) => (
                  <Chip
                    key={doc.url}
                    size="small"
                    component={Link}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    clickable
                    label={doc.type}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          <TextField label={t('onboarding.common.reviewerNotes')} value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} fullWidth />
          <TextField
            label={t('onboarding.common.tags')}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            helperText={t('onboarding.venues.commaSeparatedTagsForThisApproved')}
            fullWidth
          />

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 800
            }}>
              Venue deductions
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              The commission Duncit takes from the venue payout (after GST). Defaults to the{' '}
              {defaultCommissionPct ?? '—'}% set in Finance → Default Deductions; change it here to
              override it for this venue only, or set 0 to always follow the default.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField
                label={t('onboarding.venues.commissionFromVenue')}
                type="number"
                size="small"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                error={!valid(commission)}
                helperText={valid(commission) ? undefined : 'Enter a number between 0 and 100.'}
                fullWidth
                slotProps={{
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                  htmlInput: { min: 0, max: 100, step: 1, 'aria-label': 'Venue commission percentage' }
                }} />
            </Stack>
            <DuncitButton
              variant="outlined"
              size="small"
              onClick={saveDeductions}
              disabled={savingDeductions || !valid(commission) || unchanged}
              sx={{ mt: 1.5 }}
            >
              {savingDeductions ? 'Saving…' : 'Save deductions'}
            </DuncitButton>
          </Paper>
        </Stack>
      </DialogContent>
      <Divider />
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
