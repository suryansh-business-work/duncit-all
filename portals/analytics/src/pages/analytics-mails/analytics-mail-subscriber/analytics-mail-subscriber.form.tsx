import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DialogActions, DialogContent, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { PERIOD_OPTIONS } from '../../entity-analytics/queries';
import DashboardPicker from './DashboardPicker';
import { subscriberSchema, type SubscriberValues } from './analytics-mail-subscriber.types';

interface Props {
  defaultValues: SubscriberValues;
  busy: boolean;
  onCancel: () => void;
  /** Handles its own failure — the dialog reports it and stays open. */
  onSubmit: (values: SubscriberValues) => Promise<void>;
}

/**
 * Who a report goes to and what it holds: a name and an address, the
 * dashboards, daily or weekly, the period each report covers, and whether it
 * is sending. Laid out as a dialog's content and actions.
 */
export default function AnalyticsMailSubscriberForm({ defaultValues, busy, onCancel, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit } = useForm<SubscriberValues>({
    defaultValues,
    resolver: zodResolver(
      subscriberSchema({
        nameRequired: t('analytics.mails.nameRequired'),
        nameTooLong: t('analytics.mails.nameTooLong'),
        emailFormat: t('analytics.mails.emailFormat'),
        pagesRequired: t('analytics.mails.pagesRequired'),
      })
    ),
    mode: 'all',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="analytics-mail-subscriber-form">
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RhfTextField<SubscriberValues>
              control={control}
              name="name"
              label={t('analytics.mails.name')}
              hint={t('analytics.mails.nameHint')}
              required
              slotProps={{ htmlInput: { 'data-testid': 'analytics-mail-name', maxLength: 120 } }}
            />
            <RhfTextField<SubscriberValues>
              control={control}
              name="email"
              type="email"
              label={t('analytics.mails.email')}
              hint={t('analytics.mails.emailHint')}
              required
              slotProps={{ htmlInput: { 'data-testid': 'analytics-mail-email', autoComplete: 'email' } }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth label={t('analytics.mails.frequency')} helperText={t('analytics.mails.frequencyHint')}>
                  <MenuItem value="DAILY">{t('analytics.mails.daily')}</MenuItem>
                  <MenuItem value="WEEKLY">{t('analytics.mails.weekly')}</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="days"
              control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth label={t('analytics.mails.period')} helperText={t('analytics.mails.periodHint')}>
                  {PERIOD_OPTIONS.map((option) => (
                    <MenuItem key={option.days} value={option.days}>
                      {t(option.label)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
          <Controller
            name="pages"
            control={control}
            render={({ field, fieldState }) => (
              <DashboardPicker value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                label={t('analytics.mails.active')}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('analytics.mails.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} data-testid="analytics-mail-subscriber-save">
          {t('analytics.mails.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
