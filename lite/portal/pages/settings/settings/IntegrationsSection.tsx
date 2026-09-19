import type { Control } from 'react-hook-form';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { usePortalT } from '../../../../shared/i18n';
import { RhfSwitch } from '../../../components/RhfSwitch';
import type { SettingsFormValues } from './settings.types';

interface Props {
  control: Control<SettingsFormValues>;
  busy: boolean;
}

/** Duncit sign-in, reminders, the UPI note and the always-admin addresses. */
export function IntegrationsSection({ control, busy }: Readonly<Props>) {
  const { t } = usePortalT();
  return (
    <>
      <SectionCard title={t('litePortal.settings.duncit')}>
        <Stack spacing={1.5}>
          <RhfSwitch control={control} name="sign_in_with_duncit" label={t('litePortal.settings.signInWithDuncit')} hint={t('litePortal.settings.signInWithDuncitHint')} disabled={busy} testId="settings-sign-in-with-duncit" />
          <RhfTextField
            control={control}
            name="duncit_graphql_url"
            type="url"
            label={t('litePortal.settings.duncitGraphqlUrl')}
            hint={t('litePortal.settings.duncitGraphqlUrlHint')}
            disabled={busy}
            slotProps={{ htmlInput: { 'data-testid': 'settings-duncit-graphql-url' } }}
          />
          <RhfTextField
            control={control}
            name="duncit_app_url"
            type="url"
            label={t('litePortal.settings.duncitAppUrl')}
            hint={t('litePortal.settings.duncitAppUrlHint')}
            disabled={busy}
            slotProps={{ htmlInput: { 'data-testid': 'settings-duncit-app-url' } }}
          />
        </Stack>
      </SectionCard>
      <SectionCard title={t('litePortal.settings.reminders')}>
        <Stack spacing={1.5}>
          <RhfSwitch control={control} name="reminders_enabled" label={t('litePortal.settings.remindersEnabled')} hint={t('litePortal.settings.remindersEnabledHint')} disabled={busy} testId="settings-reminders-enabled" />
          <RhfTextField
            control={control}
            name="reminder_hours_before"
            label={t('litePortal.settings.reminderHours')}
            hint={t('litePortal.settings.reminderHoursHint')}
            disabled={busy}
            slotProps={{ htmlInput: { 'data-testid': 'settings-reminder-hours' } }}
          />
        </Stack>
      </SectionCard>
      <SectionCard title={t('litePortal.settings.payments')}>
        <RhfTextField
          control={control}
          name="upi_help_text"
          label={t('litePortal.settings.upiHelpText')}
          hint={t('litePortal.settings.upiHelpTextHint')}
          multiline
          minRows={3}
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'settings-upi-help-text' } }}
        />
      </SectionCard>
      <SectionCard title={t('litePortal.settings.admins')}>
        <RhfTextField
          control={control}
          name="admin_emails"
          label={t('litePortal.settings.adminEmails')}
          hint={t('litePortal.settings.adminEmailsHint')}
          multiline
          minRows={2}
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'settings-admin-emails' } }}
        />
      </SectionCard>
    </>
  );
}
