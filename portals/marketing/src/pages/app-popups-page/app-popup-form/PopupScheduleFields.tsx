import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, Grid, MenuItem, Switch } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { RhfTextField } from '@duncit/forms';
import { platformOptions, type AppPopupFormValues } from './app-popup.types';
import { useTranslation } from '@duncit/app-settings';

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
  const { t } = useTranslation();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <Controller
          control={control}
          name="start_at"
          render={({ field, fieldState }) => (
            <DateTimePicker
              label={t('marketing.common.starts')}
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
              label={t('marketing.common.ends')}
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
          label={t('marketing.appPopups.targetPlatform')}
          select
          required
          hint="Which app builds see it"
        >
          {platformOptions(t).map((option) => (
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
              label={t('marketing.appPopups.enabled')}
            />
          )}
        />
        <Controller
          control={control}
          name="close_button_enabled"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={field.onChange} />}
              label={t('marketing.appPopups.showCloseButton')}
            />
          )}
        />
      </Grid>
    </Grid>
  );
}
