import { Controller, type UseFormReturn } from 'react-hook-form';
import { Alert, AlertTitle, Stack, TextField } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DateField from '../../../components/DateField';
import type { RegisterVenueValues } from '../register-venue';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  accountEmail: string;
}

export default function OwnerSection({ form, accountEmail }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = form;

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" icon={<EventAvailableIcon />}>
        <AlertTitle sx={{ fontWeight: 800 }}>{t('partners.registerVenuePage.whereSlotRequestsArrive')}</AlertTitle>
        Pod-related venue slot requests come to these owner details once your venue is approved —
        you can accept or deny each request from your Venue Studio.
      </Alert>
      <Controller
        name="owner_name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={t('partners.registerVenuePage.ownerName')}
            required
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? 'Person hosts should reach out to'}
          />
        )}
      />
      <Controller
        name="owner_email"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={t('partners.registerVenuePage.ownerEmail')}
            type="email"
            required
            disabled
            error={Boolean(fieldState.error)}
            helperText={
              fieldState.error?.message ??
              (accountEmail ? 'Locked to your Duncit account' : 'Loaded from your Duncit account')
            }
            slotProps={{
              input: { readOnly: true }
            }}
          />
        )}
      />
      <Controller
        name="owner_phone"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label={t('partners.registerVenuePage.ownerPhone')}
            required
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? 'Digits only, with optional + country code'}
          />
        )}
      />
      <Controller
        name="owner_dob"
        control={control}
        render={({ field, fieldState }) => (
          <DateField
            label={t('partners.registerVenuePage.ownerDob')}
            required
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? 'Used for identity checks'}
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
            label={t('partners.registerVenuePage.ownerAddress')}
            required
            multiline
            minRows={2}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? 'Correspondence address (max 500 characters)'}
          />
        )}
      />
    </Stack>
  );
}
