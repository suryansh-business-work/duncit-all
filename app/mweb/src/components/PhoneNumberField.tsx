import { Controller, useFormContext } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@mui/material';

type Omitted = 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText' | 'type';

interface PhoneNumberFieldProps extends Omit<TextFieldProps, Omitted> {
  name?: string;
  hint?: string;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 15);

export default function PhoneNumberField({
  name = 'phone_number',
  hint,
  inputProps,
  ...rest
}: Readonly<PhoneNumberFieldProps>) {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const showError = !!fieldState.error;
        return (
          <TextField
            {...rest}
            name={field.name}
            value={field.value ?? ''}
            type="tel"
            fullWidth={rest.fullWidth ?? true}
            error={showError}
            helperText={showError ? fieldState.error?.message : (hint ?? ' ')}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(onlyDigits(event.target.value))}
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 15,
              ...inputProps,
            }}
          />
        );
      }}
    />
  );
}
