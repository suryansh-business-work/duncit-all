import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, MenuItem } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { RhfTextField } from '@duncit/forms';
import { FormActionsRow } from '@duncit/ui';
import { adPositionOptions } from '../ad-options';
import AdMediaField from '../AdMediaField';
import { useTranslation } from '../i18n/useTranslation';
import {
  AD_DURATION_FALLBACK,
  makeAdRequestSchema,
  type AdRequestFormProps,
  type AdRequestFormValues,
} from '../ad-request.types';
import AdScheduleFields from './AdScheduleFields';
import AdTypeField from './AdTypeField';
import { dayLabel } from './dayLabel';

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

  const { control, handleSubmit, setValue, watch, formState } = useForm<AdRequestFormValues, any, AdRequestFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as unknown as Resolver<AdRequestFormValues, any, AdRequestFormValues>,
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
          <AdTypeField control={control} setValue={setValue} />
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
        <AdScheduleFields control={control} window={window} durationMarks={durationMarks} />
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
        <FormActionsRow
          errorMessage={errorMessage}
          busy={busy}
          disabled={!formState.isValid}
          startIcon={<SendIcon />}
          submitLabel={submitLabel ?? t('adRequest.form.submit')}
        />
      </Grid>
    </form>
  );
}
