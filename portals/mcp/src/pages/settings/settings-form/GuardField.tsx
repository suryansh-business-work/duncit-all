import { useId } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { GUARD_MODE_KEYS, GUARD_MODES } from '../../../lib/labels';

interface GuardFieldProps<T extends FieldValues, TOut> {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
}

/** The prompt-injection guard a call gets when it does not choose one: block or warn. */
export default function GuardField<T extends FieldValues, TOut>({ control, name }: Readonly<GuardFieldProps<T, TOut>>) {
  const { t } = useTranslation();
  const labelId = useId();
  const hintId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur } }) => (
        <FormControl>
          <FormLabel id={labelId}>{t('mcp.settings.defaultGuard')}</FormLabel>
          <RadioGroup
            row
            ref={ref}
            aria-labelledby={labelId}
            aria-describedby={hintId}
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
          >
            {GUARD_MODES.map((mode) => (
              <FormControlLabel key={mode} value={mode} control={<Radio />} label={t(GUARD_MODE_KEYS[mode])} />
            ))}
          </RadioGroup>
          <FormHelperText id={hintId}>{t('mcp.settings.defaultGuardHint')}</FormHelperText>
        </FormControl>
      )}
    />
  );
}
