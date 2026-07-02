import { Controller, type UseFormReturn } from 'react-hook-form';
import { Alert, AlertTitle, Stack, TextField } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DateField from '../../../components/DateField';
import type { RegisterVenueValues } from '../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  accountEmail: string;
}

export default function OwnerSection({ form, accountEmail }: Readonly<Props>) {
  const { control } = form;

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" icon={<EventAvailableIcon />}>
        <AlertTitle sx={{ fontWeight: 800 }}>Where slot requests arrive</AlertTitle>
        Pod-related venue slot requests come to these owner details once your venue is approved —
        you can accept or deny each request from your Venue Studio.
      </Alert>
      <Controller
        name="owner_name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Owner name"
            required
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
          />
        )}
      />
      <Controller
        name="owner_email"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Owner email"
            type="email"
            required
            disabled
            InputProps={{ readOnly: true }}
            error={Boolean(fieldState.error)}
            helperText={
              fieldState.error?.message ??
              (accountEmail ? 'Locked to your Duncit account' : 'Loaded from your Duncit account')
            }
          />
        )}
      />
      <Controller
        name="owner_phone"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Owner phone"
            required
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
          />
        )}
      />
      <Controller
        name="owner_dob"
        control={control}
        render={({ field, fieldState }) => (
          <DateField
            label="Owner DOB"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
            maxDate={new Date()}
          />
        )}
      />
      <Controller
        name="owner_address"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Owner address"
            multiline
            minRows={2}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? ' '}
          />
        )}
      />
    </Stack>
  );
}
