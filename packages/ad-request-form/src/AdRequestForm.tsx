import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Grid, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RhfTextField } from '@duncit/forms';
import { AD_MEDIA_TYPE_OPTIONS, AD_POSITION_OPTIONS } from './ad-options';
import AdMediaField from './AdMediaField';
import { adRequestSchema, type AdRequestFormProps, type AdRequestFormValues } from './ad-request.types';

const DURATION_MARKS = [
  { value: 1, label: '1 day' },
  { value: 30, label: '1 month' },
];

/** The shared ad-request form (RHF + Zod), used by the Ads portal Create Ad page
 * and the Partner portal's "Run ad" dialog. */
export default function AdRequestForm({
  initialValues,
  busy,
  errorMessage,
  onValuesChange,
  onSubmit,
  submitLabel = 'Submit Ad Request',
}: Readonly<AdRequestFormProps>) {
  const { control, handleSubmit, setValue, watch, formState } = useForm<AdRequestFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(adRequestSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    const subscription = watch((values) => onValuesChange(values as AdRequestFormValues));
    return () => subscription.unsubscribe();
  }, [watch, onValuesChange]);

  const adType = watch('ad_type');
  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RhfTextField control={control} name="ad_title" label="Ad Title" required hint="3–120 characters" />
        </Grid>
        <Grid item xs={12}>
          <RhfTextField
            control={control}
            name="ad_description"
            label="Ad Description"
            required
            multiline
            minRows={3}
            hint="What the ad promotes (10–1000 characters)"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            control={control}
            name="ad_type"
            render={({ field }) => (
              <TextField
                label="Ad Type"
                select
                fullWidth
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  setValue('media_url', '', { shouldValidate: true });
                }}
                onBlur={field.onBlur}
                helperText="Changing the type clears the uploaded media"
              >
                {AD_MEDIA_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <RhfTextField control={control} name="position" label="Ad Position" select hint="Auto shows the ad across every placement">
            {AD_POSITION_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            control={control}
            name="start_at"
            render={({ field, fieldState }) => (
              <DatePicker
                label="Ad Start Date"
                value={field.value ? new Date(field.value) : null}
                onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                disablePast
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!fieldState.error,
                    helperText: fieldState.error?.message ?? 'Today or later',
                  },
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            control={control}
            name="duration_days"
            render={({ field }) => (
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom id="ad-duration-label">
                  Ad Duration: {field.value} {field.value === 1 ? 'day' : 'days'} (1 day – 1 month)
                </Typography>
                <Slider
                  value={field.value}
                  onChange={(_event, value) => field.onChange(value as number)}
                  min={1}
                  max={30}
                  step={1}
                  marks={DURATION_MARKS}
                  valueLabelDisplay="auto"
                  aria-labelledby="ad-duration-label"
                />
              </Box>
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            control={control}
            name="media_url"
            render={({ field, fieldState }) => (
              <AdMediaField
                adType={adType}
                value={field.value}
                onChange={field.onChange}
                required
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <RhfTextField control={control} name="redirect_url" label="Redirect URL" hint="Optional — where the ad opens; must be an http(s) link" />
        </Grid>
        <Grid item xs={12}>
          <RhfTextField control={control} name="target_audience" label="Target Audience" multiline minRows={2} hint="Optional — describe who the ad should reach" />
        </Grid>
        {errorMessage && (
          <Grid item xs={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="flex-end">
            <Button type="submit" variant="contained" startIcon={<SendIcon />} disabled={busy || !formState.isValid}>
              {submitLabel}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
