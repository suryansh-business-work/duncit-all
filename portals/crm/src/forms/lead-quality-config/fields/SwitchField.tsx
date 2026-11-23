import { useId } from 'react';
import { Controller, useFormContext, type FieldPathByValue } from 'react-hook-form';
import { Box, FormControlLabel, FormHelperText, Switch } from '@mui/material';
import type { LeadQualityConfigFormValues } from '../lead-quality-config.schema';

interface Props {
  name: FieldPathByValue<LeadQualityConfigFormValues, boolean>;
  label: string;
  /** What switching it on means, read out with the switch. */
  hint?: string;
}

/** A yes/no field of the scoring model (enabled, mandatory gate, qualify on gates only). */
export default function SwitchField({ name, label, hint }: Readonly<Props>) {
  const hintId = useId();
  const { control } = useFormContext<LeadQualityConfigFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Box>
          <FormControlLabel
            label={label}
            control={
              <Switch
                checked={field.value === true}
                onChange={(event) => field.onChange(event.target.checked)}
                onBlur={field.onBlur}
                disabled={field.disabled}
                // The ref goes to the <input> so a failed submit can focus it.
                slotProps={{ input: { ref: field.ref, 'aria-describedby': hint ? hintId : undefined } }}
              />
            }
          />
          {hint && (
            <FormHelperText id={hintId} sx={{ mt: 0 }}>
              {hint}
            </FormHelperText>
          )}
        </Box>
      )}
    />
  );
}
