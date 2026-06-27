import { Controller, useFormContext } from 'react-hook-form';
import { FormControlLabel, Switch } from '@mui/material';

interface Props {
  name: string;
  label: string;
}

/** Boolean switch bound to react-hook-form. */
export default function SwitchField({ name, label }: Readonly<Props>) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Switch
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              onBlur={field.onBlur}
              ref={field.ref}
            />
          }
          label={label}
          componentsProps={{ typography: { variant: 'body2' } }}
        />
      )}
    />
  );
}
