import { Controller, type Control } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { useLabelOptions } from '../../shared/useLabelOptions';
import { MANUAL_LIMITS } from '../../shared/vocabulary';
import type { CaseDetailsValues } from './case-details.types';

interface Props {
  control: Control<CaseDetailsValues>;
  disabled: boolean;
}

/** Labels: pick ones already in use, or type a new one and press Enter. */
export function LabelsField({ control, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useLabelOptions();
  return (
    <Controller
      control={control}
      name="labels"
      render={({ field, fieldState }) => (
        <Autocomplete
          multiple
          freeSolo
          filterSelectedOptions
          size="small"
          disabled={disabled}
          options={labels.options}
          value={field.value}
          onChange={(_event, next) => field.onChange(next.map((label) => label.trim()).filter(Boolean))}
          inputValue={labels.input}
          onInputChange={(_event, next) => labels.setInput(next.slice(0, MANUAL_LIMITS.labelMax))}
          loading={labels.loading}
          loadingText={t('testsManual.common.loading')}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={field.ref}
              onBlur={field.onBlur}
              label={t('testsManual.field.labels')}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? t('testsManual.details.labelsHint')}
            />
          )}
        />
      )}
    />
  );
}
