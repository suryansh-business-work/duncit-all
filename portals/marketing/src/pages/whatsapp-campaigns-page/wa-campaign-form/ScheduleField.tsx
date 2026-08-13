import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, Stack, Switch } from '@mui/material';
import DateTimeField from '../../../components/DateTimeField';
import type { WaCampaignValues } from './wa-campaign.types';

/** Switching the schedule on lands an hour from now — a sane, editable start
 * rather than an empty picker. */
const defaultScheduleIso = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

/** When this send goes out: now, or at an hour you pick. */
export default function ScheduleField({
  control,
}: Readonly<{ control: Control<WaCampaignValues> }>) {
  return (
    <Controller
      control={control}
      name="scheduled_at"
      render={({ field, fieldState }) => (
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={!!field.value}
                // Turning it off clears the time — a hidden schedule is how a
                // send goes out at the wrong hour.
                onChange={(_, on) => field.onChange(on ? defaultScheduleIso() : '')}
              />
            }
            label="Schedule for later"
          />
          {field.value ? (
            <DateTimeField
              label="Send at"
              value={field.value}
              onChange={field.onChange}
              minDateTime={new Date()}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
            />
          ) : null}
        </Stack>
      )}
    />
  );
}
