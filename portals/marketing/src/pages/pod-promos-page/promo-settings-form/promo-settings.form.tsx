import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Divider, Grid, Stack } from '@mui/material';
import { FormActionsRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import AudienceFields from './AudienceFields';
import ScheduleFields from './ScheduleFields';
import { promoSettingsSchema, toFormValues, type PromoSettingsFormProps, type PromoSettingsFormValues } from './promo-settings.types';

/**
 * The automatic pod promotion settings: when a post goes out, to which
 * accounts, whether a manager signs it off, what the banner says, and which
 * pods are promoted at all.
 */
export default function PromoSettingsForm({ settings, options, readOnly, busy, onSubmit }: Readonly<PromoSettingsFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState, reset } = useForm<PromoSettingsFormValues, unknown, PromoSettingsFormValues>({
    defaultValues: toFormValues(settings),
    resolver: zodResolver(promoSettingsSchema(t)) as unknown as Resolver<PromoSettingsFormValues, unknown, PromoSettingsFormValues>,
    mode: 'onChange',
  });

  // What the server last answered is the baseline, not a pending edit.
  useEffect(() => {
    reset(toFormValues(settings));
  }, [settings, reset]);

  const disabled = readOnly || busy;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} aria-label={t('marketing.podPromo.settingsTitle')} data-testid="promo-settings-form">
      <Stack spacing={2}>
        <ScheduleFields control={control} options={options} disabled={disabled} timeZone={settings.time_zone} />
        <Divider />
        <AudienceFields control={control} options={options} disabled={disabled} />
        {readOnly ? null : (
          <Grid container spacing={2}>
            <FormActionsRow busy={busy} disabled={!formState.isValid || !formState.isDirty} submitLabel={t('marketing.podPromo.saveSettings')} />
          </Grid>
        )}
      </Stack>
    </form>
  );
}
