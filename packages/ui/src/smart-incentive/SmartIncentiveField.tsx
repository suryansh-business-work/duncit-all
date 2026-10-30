import { useState } from 'react';
import { FormControlLabel, InputAdornment, Link, Stack, Switch, TextField, Typography } from '@mui/material';
import { smartIncentiveFor, type SmartIncentiveFieldProps } from '@duncit/utils';
import { SmartIncentiveInfoDialog } from './SmartIncentiveInfoDialog';

// The props contract is shared with the native twin, so it lives in @duncit/utils.
export type { SmartIncentiveFieldProps } from '@duncit/utils';

/** What one ticket costs with the offer, formatted — undefined without a price or a whole, positive %. */
function offerPrice(
  pct: string,
  unitPrice: number | undefined,
  formatPrice: ((amount: number) => string) | undefined,
): string | undefined {
  if (unitPrice === undefined || formatPrice === undefined) return undefined;
  const quote = smartIncentiveFor(unitPrice, Number(pct));
  return quote.pct > 0 ? formatPrice(quote.net) : undefined;
}

/**
 * The host's Smart Incentive editor: a switch, the discount % and what a
 * ticket then costs. Switching it ON opens the explainer, and "How it works"
 * reopens it.
 *
 * Controlled and form-library free — the calling form owns the values and
 * runs `smartIncentivePctIssue` from `@duncit/utils` in its own Zod refine,
 * then hands the translated message back as `error`. That is what lets the
 * mWeb Create Pod stepper and the host's Edit Pod dialog render this one copy.
 * Native twin: `app/mobile-app/src/components/create-pod/SmartIncentiveField.tsx`
 * (same test ids).
 */
export function SmartIncentiveField({
  enabled,
  pct,
  onEnabledChange,
  onPctChange,
  onPctBlur,
  maxPct,
  delaySeconds,
  labels,
  unitPrice,
  formatPrice,
  error,
  disabled = false,
}: SmartIncentiveFieldProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const toggle = (checked: boolean) => {
    onEnabledChange(checked);
    if (checked) setInfoOpen(true);
  };
  const preview = enabled ? offerPrice(pct, unitPrice, formatPrice) : undefined;

  return (
    <Stack spacing={1.5} data-testid="smart-incentive-field">
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {labels.title}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(_event, checked) => toggle(checked)}
              disabled={disabled}
              data-testid="smart-incentive-switch"
            />
          }
          label={labels.switchLabel}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {labels.hint}
        </Typography>
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={() => setInfoOpen(true)}
          data-testid="smart-incentive-learn-more"
          sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
        >
          {labels.learnMore}
        </Link>
      </Stack>
      {enabled && (
        <Stack spacing={0.5}>
          <TextField
            type="number"
            size="small"
            label={labels.pctLabel}
            value={pct}
            onChange={(e) => onPctChange(e.target.value)}
            onBlur={onPctBlur}
            error={Boolean(error)}
            helperText={error ?? labels.maxHint(maxPct)}
            disabled={disabled}
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
              htmlInput: { min: 1, max: maxPct, step: 1, 'data-testid': 'smart-incentive-pct' },
            }}
          />
          {preview !== undefined && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="smart-incentive-price-preview">
              {labels.pricePreview(preview)}
            </Typography>
          )}
        </Stack>
      )}
      <SmartIncentiveInfoDialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        labels={labels.info}
        delaySeconds={delaySeconds}
      />
    </Stack>
  );
}
