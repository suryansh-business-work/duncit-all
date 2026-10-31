import { Controller, useWatch, type Control } from 'react-hook-form';
import { Autocomplete, IconButton, MenuItem, Stack, TextField } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from '@duncit/app-settings';
import { KIND_LABELS, OUTCOME_LABELS, STEP_KINDS, type FunnelValues } from './funnel-form.types';

interface Props {
  index: number;
  control: Control<FunnelValues>;
  /** Event names and screen names the period holds, most frequent first. */
  events: readonly string[];
  screens: readonly string[];
  canRemove: boolean;
  onRemove: () => void;
}

/** One step: what kind it is, and which event, screen, element or outcome. */
export default function StepRow({ index, control, events, screens, canRemove, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const kind = useWatch({ control, name: `steps.${index}.kind` });
  const choices = kind === 'SCREEN' ? screens : events;
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} data-testid={`funnel-step-${index}`}>
      <Controller
        control={control}
        name={`steps.${index}.kind`}
        render={({ field }) => (
          <TextField
            select
            size="small"
            label={t('analytics.product.funnels.stepKind', { vars: { step: index + 1 } })}
            {...field}
            sx={{ minWidth: 170 }}
          >
            {STEP_KINDS.map((one) => (
              <MenuItem key={one} value={one}>
                {t(KIND_LABELS[one])}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        control={control}
        name={`steps.${index}.value`}
        render={({ field, fieldState }) =>
          kind === 'OUTCOME' ? (
            <TextField select size="small" label={t('analytics.product.funnels.stepValue')} {...field} sx={{ flex: 1 }} error={Boolean(fieldState.error)} helperText={fieldState.error?.message}>
              {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {t(label)}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Autocomplete
              freeSolo
              options={kind === 'ELEMENT' ? [] : [...choices]}
              value={field.value}
              onInputChange={(_event, value) => field.onChange(value)}
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={t('analytics.product.funnels.stepValue')}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          )
        }
      />
      <IconButton onClick={onRemove} disabled={!canRemove} aria-label={t('analytics.product.funnels.removeStep')}>
        <DeleteOutlineIcon />
      </IconButton>
    </Stack>
  );
}
