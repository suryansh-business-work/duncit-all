import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControlLabel, Switch } from '@mui/material';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

/** A labelled on/off field bound to the form. */
export default function RhfSwitch<T extends FieldValues>({ control, name, label }: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          control={<Switch checked={Boolean(field.value)} onChange={(_e, checked) => field.onChange(checked)} onBlur={field.onBlur} />}
          label={label}
        />
      )}
    />
  );
}
