import { useId } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, InputLabel, MenuItem, Radio, RadioGroup, Select, Stack } from '@mui/material';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { useStoreT } from '../../i18n';

interface PlanFieldsProps<T extends FieldValues> {
  /** A form whose values include `frequency_weeks` and `mode`. */
  control: Control<T>;
}

/** "Every N weeks" and "order it for me (COD) / remind me" — the two choices of a plan. */
export function AutoshipPlanFields<T extends FieldValues>({ control }: Readonly<PlanFieldsProps<T>>) {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  const frequencyLabel = useId();
  const modeLabel = useId();
  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name={'frequency_weeks' as Path<T>}
        render={({ field, fieldState }) => (
          <FormControl fullWidth error={Boolean(fieldState.error)}>
            <InputLabel id={frequencyLabel}>{t('ecommStore.autoship.frequency')}</InputLabel>
            <Select
              labelId={frequencyLabel}
              label={t('ecommStore.autoship.frequency')}
              value={field.value}
              onChange={(event) => field.onChange(Number(event.target.value))}
              inputRef={field.ref}
            >
              {settings.autoship_frequencies.map((weeks) => (
                <MenuItem key={weeks} value={weeks}>
                  {t('ecommStore.autoship.everyWeeks', { count: weeks })}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{fieldState.error?.message ?? ' '}</FormHelperText>
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name={'mode' as Path<T>}
        render={({ field }) => (
          <FormControl>
            <FormLabel id={modeLabel}>{t('ecommStore.autoship.mode')}</FormLabel>
            <RadioGroup aria-labelledby={modeLabel} value={field.value} onChange={(event) => field.onChange(event.target.value)}>
              <FormControlLabel value="REMIND" control={<Radio />} label={t('ecommStore.autoship.modeRemind')} />
              <FormControlLabel value="COD_AUTO" control={<Radio />} label={t('ecommStore.autoship.modeCod')} disabled={!settings.cod_enabled} />
            </RadioGroup>
          </FormControl>
        )}
      />
    </Stack>
  );
}
