import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import EnvVariablesTab from '../environment/EnvVariablesTab';

/**
 * MSG91 OTP Logs → MSG91 Settings: the MSG91 category of Environment
 * Variables on a page of its own — the widget ID and auth key behind every
 * phone code, with the same add / edit / test drawer. The Communications and
 * Logs consoles mount this page too, so the keys have one editor and three
 * doors; what each console may do with them is decided by the server.
 */
export default function Msg91SettingsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5}>
      <PageHeader title={t('tech.msg91.settingsTitle')} subtitle={t('tech.msg91.settingsSubtitle')} />
      <EnvVariablesTab category="MSG91" />
    </Stack>
  );
}
