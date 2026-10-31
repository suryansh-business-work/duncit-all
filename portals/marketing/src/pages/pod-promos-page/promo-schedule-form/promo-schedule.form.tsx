import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid } from '@mui/material';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import { FormActionsRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import CollaboratorsField from '../../../components/CollaboratorsField';
import DateTimeField from '../../../components/DateTimeField';
import MultiPickField from '../promo-settings-form/MultiPickField';
import { blankScheduleValues, promoScheduleSchema, type PromoScheduleFormProps, type PromoScheduleFormValues } from './promo-schedule.types';

/**
 * Schedule the carousel just made: when, to which accounts, and who is
 * invited as an Instagram collaborator. Anything left empty is what the
 * planner would have picked from the settings.
 */
export default function PromoScheduleForm({ accounts, collaborators, timeZone, busy, onSubmit }: Readonly<PromoScheduleFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm<PromoScheduleFormValues, unknown, PromoScheduleFormValues>({
    defaultValues: blankScheduleValues(collaborators),
    resolver: zodResolver(promoScheduleSchema(t)) as unknown as Resolver<PromoScheduleFormValues, unknown, PromoScheduleFormValues>,
    mode: 'onChange',
  });

  const submit = (values: PromoScheduleFormValues) => onSubmit(values, collaborators !== null || !!formState.dirtyFields.collaborators);

  return (
    <form noValidate onSubmit={handleSubmit(submit)} aria-label={t('marketing.podPromo.scheduleTitle')} data-testid="promo-schedule-form">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            control={control}
            name="at"
            render={({ field, fieldState }) => (
              <DateTimeField
                label={t('marketing.podPromo.scheduleAt')}
                value={field.value}
                onChange={field.onChange}
                minDateTime={new Date()}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? t('marketing.podPromo.scheduleAtHint', { vars: { zone: timeZone } })}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MultiPickField<PromoScheduleFormValues>
            control={control}
            name="account_ids"
            label={t('marketing.podPromo.scheduleAccounts')}
            hint={t('marketing.podPromo.scheduleAccountsHint')}
            options={accounts}
            disabled={busy}
            testId="promo-schedule-accounts"
          />
        </Grid>
        <Grid size={12}>
          <Controller
            control={control}
            name="collaborators"
            render={({ field, fieldState }) => (
              <CollaboratorsField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                disabled={busy}
                error={fieldState.error?.message}
                hint={collaborators === null ? t('marketing.podPromo.collaboratorsAutoHint') : undefined}
                testId="promo-schedule-collaborators"
              />
            )}
          />
        </Grid>
        <FormActionsRow busy={busy} disabled={!formState.isValid} startIcon={<ScheduleSendIcon />} submitLabel={t('marketing.podPromo.schedulePromo')} />
      </Grid>
    </form>
  );
}
