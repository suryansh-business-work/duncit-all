import { Controller, type Control } from 'react-hook-form';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { PERIOD_OPTIONS } from '../../entity-analytics/queries';
import type { AnalyticsAlertCondition } from '../queries';
import { CHANGE_CONDITIONS, CONDITIONS, type AlertValues } from './analytics-alert.types';

/** Every condition's words, written out so the localization gate can see each key. */
export const CONDITION_LABELS: Record<AnalyticsAlertCondition, string> = {
  ABOVE: 'analytics.alerts.conditionAbove',
  BELOW: 'analytics.alerts.conditionBelow',
  RISES_BY: 'analytics.alerts.conditionRisesBy',
  FALLS_BY: 'analytics.alerts.conditionFallsBy',
};

interface Props {
  control: Control<AlertValues>;
  condition: AnalyticsAlertCondition;
  /** The chosen tile is a live count, which has no earlier period to change against. */
  liveTile: boolean;
}

/** When the alert trips: the condition, the number it compares with, and the period it reads. */
export default function RuleFields({ control, condition, liveTile }: Readonly<Props>) {
  const { t } = useTranslation();
  const byChange = CHANGE_CONDITIONS.has(condition);
  const percent = byChange ? { input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } } : {};
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Controller
        name="condition"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            fullWidth
            label={t('analytics.alerts.condition')}
            helperText={liveTile ? t('analytics.alerts.liveTileHint') : t('analytics.alerts.conditionHint')}
            slotProps={{ htmlInput: { 'data-testid': 'analytics-alert-condition' } }}
          >
            {CONDITIONS.map((option) => (
              <MenuItem key={option} value={option} disabled={liveTile && CHANGE_CONDITIONS.has(option)}>
                {t(CONDITION_LABELS[option])}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <RhfTextField<AlertValues>
        control={control}
        name="threshold"
        type="number"
        required
        label={t('analytics.alerts.threshold')}
        hint={byChange ? t('analytics.alerts.thresholdChangeHint') : t('analytics.alerts.thresholdValueHint')}
        slotProps={{ ...percent, htmlInput: { 'data-testid': 'analytics-alert-threshold', step: 'any', inputMode: 'decimal' } }}
      />
      <Controller
        name="days"
        control={control}
        render={({ field }) => (
          <TextField {...field} select fullWidth label={t('analytics.alerts.period')} helperText={t('analytics.alerts.periodHint')}>
            {PERIOD_OPTIONS.map((option) => (
              <MenuItem key={option.days} value={option.days}>
                {t(option.label)}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Stack>
  );
}
