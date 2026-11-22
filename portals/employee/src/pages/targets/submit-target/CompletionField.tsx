import { Controller } from 'react-hook-form';
import { Box, FormHelperText, FormLabel, Slider, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { SubmitTargetControl } from './submit-target.types';

/**
 * Completion as a slider and a number box bound to the same value, so it can
 * be dragged or typed. The box holds NaN while emptied; the schema names it.
 */
export default function CompletionField({ control }: Readonly<{ control: SubmitTargetControl }>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="completion_percent"
      render={({ field, fieldState }) => {
        const shown = Number.isNaN(field.value) ? '' : field.value;
        const sliderValue = Number.isNaN(field.value) ? 0 : field.value;
        return (
          <Box>
            <FormLabel id="submit-target-completion-label" required>
              {t('employeeTargets.submitForm.completion')}
            </FormLabel>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Slider
                value={sliderValue}
                min={0}
                max={100}
                step={1}
                onChange={(_event, value) => field.onChange(value)}
                aria-labelledby="submit-target-completion-label"
                getAriaValueText={(value) => t('employeeTargets.submission.percent', { vars: { percent: value } })}
                sx={{ flex: 1 }}
              />
              <TextField
                type="number"
                size="small"
                value={shown}
                inputRef={field.ref}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                error={!!fieldState.error}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    max: 100,
                    step: 1,
                    'aria-label': t('employeeTargets.submitForm.completionAria'),
                    'data-testid': 'submit-target-percent',
                  },
                }}
              />
            </Stack>
            <FormHelperText error={!!fieldState.error}>
              {fieldState.error?.message ?? t('employeeTargets.submitForm.completionHint')}
            </FormHelperText>
          </Box>
        );
      }}
    />
  );
}
