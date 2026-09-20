import { Controller, useWatch, type Control } from 'react-hook-form';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import SwitchRow from '../../../components/SwitchRow';
import type { E2eSettingsValues } from './e2e-settings.types';

/**
 * The two switches that exist only so a suite can run against a real server.
 *
 * They are deliberately separate, because only one of them is about secrecy:
 * holding the traffic stops a nightly sweep mailing real people and burning
 * WhatsApp credit, while keeping the run account's codes readable is what lets
 * a test finish a signup at all — and is the one that makes a server an e2e
 * target.
 *
 * The warning shows only while something is on. A standing warning beside a
 * switch that is off is noise, and noise is what stops the real one being read.
 */
export default function OverrideFields({
  control,
}: Readonly<{ control: Control<E2eSettingsValues> }>) {
  const { t } = useTranslation();
  const muted = useWatch({ control, name: 'mute_communications' });
  const bypass = useWatch({ control, name: 'otp_bypass' });

  return (
    <Stack spacing={2}>
      <Controller
        name="mute_communications"
        control={control}
        render={({ field }) => (
          <SwitchRow
            checked={field.value}
            onChange={field.onChange}
            label={t('tech.e2e.muteCommunications')}
            hint={t('tech.e2e.muteCommunicationsHint')}
          />
        )}
      />
      <Controller
        name="otp_bypass"
        control={control}
        render={({ field }) => (
          <SwitchRow
            checked={field.value}
            onChange={field.onChange}
            label={t('tech.e2e.runAccountCodes')}
            hint={t('tech.e2e.runAccountCodesHint')}
          />
        )}
      />
      {bypass && (
        <Alert severity="error" variant="outlined">
          {t('tech.e2e.runAccountCodesWarning')}
        </Alert>
      )}
      {muted && !bypass && (
        <Alert severity="warning" variant="outlined">
          {t('tech.e2e.muteCommunicationsWarning')}
        </Alert>
      )}
    </Stack>
  );
}
