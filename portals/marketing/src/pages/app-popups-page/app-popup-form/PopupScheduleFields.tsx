import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, Grid, MenuItem, Switch } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { RhfTextField } from '@duncit/forms';
import { PLATFORM_OPTIONS, type AppPopupFormValues } from './app-popup.types';

interface Props {
  control: Control<AppPopupFormValues>;
}

/**
 * When the popup runs, where it runs, and whether it runs at all.
 *
 * The window is the only thing that starts and stops a campaign — nothing is
 * scheduled server-side, so the dates here are the whole mechanism.
 */
export default function PopupScheduleFields({ control }: Readonly<Props>) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <Controller
          control={control}
          name="start_at"
          render={({ field, fieldState }) => (
            <DateTimePicker
              label="Starts"
              value={field.value}
              onChange={field.onChange}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  required: true,
                  error: !!fieldState.error,
                  helperText: fieldState.error?.message ?? 'When the popup starts showing',
                },
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          control={control}
          name="end_at"
          render={({ field, fieldState }) => (
            <DateTimePicker
              label="Ends"
              value={field.value}
              onChange={field.onChange}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  required: true,
                  error: !!fieldState.error,
                  helperText: fieldState.error?.message ?? 'It stops on its own after this',
                },
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="platform"
          label="Target platform"
          select
          required
          hint="Which app builds see it"
        >
          {PLATFORM_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          control={control}
          name="enabled"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={field.onChange} />}
              label="Enabled"
            />
          )}
        />
        <Controller
          control={control}
          name="close_button_enabled"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={field.onChange} />}
              label="Show ✕ close button"
            />
          )}
        />
      </Grid>
    </Grid>
  );
}
