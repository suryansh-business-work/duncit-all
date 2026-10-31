import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, Stack, Switch } from '@mui/material';
import { HelpTip } from '@duncit/ui';
import type { PromoSettingsFormValues } from './promo-settings.types';

interface Props {
  control: Control<PromoSettingsFormValues>;
  name: 'enabled' | 'needs_approval';
  label: string;
  help: string;
  disabled: boolean;
  testId: string;
}

/** An on/off setting with the reason for it one hover away. */
export default function SwitchField({ control, name, label, help, disabled, testId }: Readonly<Props>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur } }) => (
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <FormControlLabel
            label={label}
            disabled={disabled}
            control={
              <Switch
                slotProps={{ input: { ref } }}
                checked={value}
                onBlur={onBlur}
                onChange={(event) => onChange(event.target.checked)}
                data-testid={testId}
              />
            }
          />
          <HelpTip title={help} />
        </Stack>
      )}
    />
  );
}
