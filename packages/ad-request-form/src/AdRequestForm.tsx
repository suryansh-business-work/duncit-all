import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Grid, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RhfTextField } from '@duncit/forms';
import { adMediaTypeOptions, adPositionOptions } from './ad-options';
import AdMediaField from './AdMediaField';
import { useTranslation, type Translate } from './i18n/useTranslation';
import {
  AD_DURATION_FALLBACK,
  makeAdRequestSchema,
  type AdRequestFormProps,
  type AdRequestFormValues,
} from './ad-request.types';

/**
 * A day count in the words a person would use.
 *
 * The old marks said "1 month" for 30, which was true only while 30 was the
 * ceiling. Now that the ceiling is a setting, the label has to be derived or it
 * will one day sit under a 90.
 */
function dayLabel(days: number, t: Translate): string {
  if (days > 1 && days % 30 === 0) return t('adRequest.months', { count: days / 30 });
  if (days > 1 && days % 7 === 0) return t('adRequest.weeks', { count: days / 7 });
  return t('adRequest.days', { count: days });
}

/** The shared ad-request form (RHF + Zod), used by the Ads portal Create Ad page
 * and the Partner portal's "Run ad" dialog. */
export default function AdRequestForm({
  initialValues,
  busy,
  errorMessage,
  onValuesChange,
  onSubmit,
  submitLabel,
  durationWindow = AD_DURATION_FALLBACK,
}: Readonly<AdRequestFormProps>) {
  const { t } = useTranslation();
  // Marketing's window, not a constant: the slider, the sentence above it, its
  // end marks and the schema all come from one pair of numbers, so the form
  // cannot offer a campaign length the server would then refuse.
  const window = useMemo(
    () => ({ min: durationWindow.min, max: Math.max(durationWindow.min, durationWindow.max) }),
    [durationWindow.min, durationWindow.max]
  );
  const schema = useMemo(() => makeAdRequestSchema(window, t), [window, t]);
  const durationMarks = useMemo(
    () => [
      { value: window.min, label: dayLabel(window.min, t) },
      { value: window.max, label: dayLabel(window.max, t) },
    ],
    [window, t]
  );

  const { control, handleSubmit, setValue, watch, formState } = useForm<AdRequestFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema),
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
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="ad_title"
            label={t('adRequest.form.title')}
            required
            hint={t('adRequest.form.titleHint')}
          />
        </Grid>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="ad_description"
            label={t('adRequest.form.description')}
            required
            multiline
            minRows={3}
            hint={t('adRequest.form.descriptionHint')}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <Controller
            control={control}
            name="ad_type"
            render={({ field }) => (
              <TextField
                label={t('adRequest.form.type')}
                select
                fullWidth
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  setValue('media_url', '', { shouldValidate: true });
                }}
                onBlur={field.onBlur}
                helperText={t('adRequest.form.typeHint')}
              >
                {adMediaTypeOptions(t).map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <RhfTextField
            control={control}
            name="position"
            label={t('adRequest.form.position')}
            select
            hint={t('adRequest.form.positionHint')}
          >
            {adPositionOptions(t).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <Controller
            control={control}
            name="start_at"
            render={({ field, fieldState }) => (
              <DatePicker
                label={t('adRequest.form.startDate')}
                value={field.value ? new Date(field.value) : null}
                onChange={(date) => field.onChange(date ? date.toISOString() : '')}
                disablePast
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!fieldState.error,
                    helperText: fieldState.error?.message ?? t('adRequest.form.startDateHint'),
                  }}}
              />
            )}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <Controller
            control={control}
            name="duration_days"
            render={({ field }) => (
              <Box sx={{ px: 1 }}>
                <Typography variant="body2" gutterBottom id="ad-duration-label" sx={{
                  color: "text.secondary"
                }}>
                  {t('adRequest.form.duration', {
                    vars: {
                      days: t('adRequest.days', { count: field.value }),
                      from: dayLabel(window.min, t),
                      to: dayLabel(window.max, t),
                    },
                  })}
                </Typography>
                <Slider
                  value={field.value}
                  onChange={(_event, value) => field.onChange(value as number)}
                  min={window.min}
                  max={window.max}
                  step={1}
                  marks={durationMarks}
                  valueLabelDisplay="auto"
                  aria-labelledby="ad-duration-label"
                />
              </Box>
            )}
          />
        </Grid>
        <Grid size={12}>
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
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="redirect_url"
            label={t('adRequest.form.redirectUrl')}
            hint={t('adRequest.form.redirectUrlHint')}
          />
        </Grid>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="target_audience"
            label={t('adRequest.form.targetAudience')}
            multiline
            minRows={2}
            hint={t('adRequest.form.targetAudienceHint')}
          />
        </Grid>
        {errorMessage && (
          <Grid size={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}
        <Grid size={12}>
          <Stack direction="row" sx={{
            justifyContent: "flex-end"
          }}>
            <Button type="submit" variant="contained" startIcon={<SendIcon />} disabled={busy || !formState.isValid}>
              {submitLabel ?? t('adRequest.form.submit')}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
