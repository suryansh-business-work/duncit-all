import { Controller, useWatch, type Control } from 'react-hook-form';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import type { CancellationTriggerValues } from './cancellation-trigger.types';

export interface RefundTierRowProps {
  control: Control<CancellationTriggerValues>;
  index: number;
  onRemove: () => void;
  t: (key: string, options?: { vars?: Record<string, string | number> }) => string;
}

/**
 * One band of the ladder: the notice it needs, the refund it pays, and the
 * sentence those two make — the reviewer is writing a promise to an attendee,
 * so they read it back in the words the attendee would.
 */
export default function RefundTierRow({ control, index, onRemove, t }: Readonly<RefundTierRowProps>) {
  const tier = useWatch({ control, name: `refund_tiers.${index}` });
  const summary = t('onboarding.venues.refundBandSummary', {
    vars: { pct: tier?.refund_pct ?? '', hours: tier?.hours_before ?? '' },
  });
  const removeLabel = t('onboarding.venues.removeRefundBand');

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Controller
          control={control}
          name={`refund_tiers.${index}.hours_before`}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('onboarding.venues.hoursBeforeStart')}
              type="number"
              size="small"
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              slotProps={{ htmlInput: { min: 0, max: 8760, step: 1 } }}
            />
          )}
        />
        <Controller
          control={control}
          name={`refund_tiers.${index}.refund_pct`}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('onboarding.venues.refundPercent')}
              type="number"
              size="small"
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              slotProps={{
                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                htmlInput: { min: 0, max: 100, step: 1 },
              }}
            />
          )}
        />
        <Tooltip title={removeLabel}>
          <span>
            <DuncitIconButton aria-label={removeLabel} onClick={onRemove} sx={{ mt: 0.5 }}>
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {summary}
      </Typography>
    </Stack>
  );
}
