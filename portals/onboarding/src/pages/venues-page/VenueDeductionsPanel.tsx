import { useEffect, useRef, useState } from 'react';
import { InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

export interface VenueDeductionsPanelProps {
  active: any;
  onSaveDeductions: (sharePct: number, commissionPct: number) => void;
  saving: boolean;
  /** Finance → Default Deductions. Undefined until the query resolves — the
   * commission field waits for it rather than seeding a misleading 0. */
  defaultCommissionPct?: number;
}

const valid = (v: string) => {
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
};

/**
 * The commission Duncit takes from this venue's payout — the review's override
 * of Finance → Default Deductions. Hoisted out of the dialog so that file stays
 * a list of panels (CLAUDE.md rule 9).
 */
export default function VenueDeductionsPanel({
  active,
  onSaveDeductions,
  saving,
  defaultCommissionPct,
}: Readonly<VenueDeductionsPanelProps>) {
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

  // An untouched field holds the finance default, and saving that would pin this
  // venue to today's number — cutting it out of every future change in Finance →
  // Default Deductions. So saving is only offered once the number actually moves.
  const unchanged = valid(commission) && Number(commission) === effectivePct;
  const saveDeductions = () => {
    // Venue share is no longer edited here — keep whatever the venue already has
    // and only override the per-venue commission (the default-deduction override).
    if (valid(commission)) onSaveDeductions(Number(active?.venue_share_pct ?? 0), Number(commission));
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {t('onboarding.venues.venueDeductions')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
            htmlInput: { min: 0, max: 100, step: 1, 'aria-label': 'Venue commission percentage' },
          }}
        />
      </Stack>
      <DuncitButton
        variant="outlined"
        size="small"
        onClick={saveDeductions}
        loading={saving}
        disabled={!valid(commission) || unchanged}
        sx={{ mt: 1.5 }}
      >
        Save deductions
      </DuncitButton>
    </Paper>
  );
}
