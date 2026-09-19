import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { usePortalT } from '../../../../shared/i18n';
import type { LiteAdminSettings } from '../../../graphql/admin';
import { DateTimeSection } from './DateTimeSection';
import { GeneralSection } from './GeneralSection';
import { IntegrationsSection } from './IntegrationsSection';
import { makeSettingsSchema, settingsValuesFrom, type SettingsFormValues } from './settings.types';

interface Props {
  initial: LiteAdminSettings;
  busy: boolean;
  /** Resolves true once the server accepted the change. */
  onSubmit: (values: SettingsFormValues) => Promise<boolean>;
}

export function SettingsForm({ initial, busy, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeSettingsSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<SettingsFormValues, unknown, SettingsFormValues>({
    defaultValues: settingsValuesFrom(initial),
    resolver: zodResolver(schema) as Resolver<SettingsFormValues, unknown, SettingsFormValues>,
    mode: 'onBlur',
  });

  // The server's copy wins whenever it changes: after a save, or another admin's edit landing in a refetch.
  useEffect(() => {
    reset(settingsValuesFrom(initial));
  }, [initial, reset]);

  const submit = handleSubmit(async (values) => {
    const ok = await onSubmit(values);
    if (ok) reset(values);
  });

  return (
    <form onSubmit={submit} noValidate data-testid="settings-form">
      <Stack spacing={2}>
        <GeneralSection control={control} busy={busy} />
        <DateTimeSection control={control} busy={busy} />
        <IntegrationsSection control={control} busy={busy} />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={() => reset(settingsValuesFrom(initial))} disabled={busy || !formState.isDirty} data-testid="settings-reset">
            {t('lite.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} disabled={!formState.isDirty} data-testid="settings-save">
            {busy ? t('lite.common.saving') : t('lite.common.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
