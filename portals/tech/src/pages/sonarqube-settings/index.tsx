import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import EnvVariablesTab from '../environment/EnvVariablesTab';

/**
 * Security → SonarQube Settings: the SonarQube category of Environment
 * Variables on a page of its own — the server URL, user token and project key
 * the SonarQube dashboard reads with, with the same add / edit / test drawer.
 */
export default function SonarqubeSettingsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5}>
      <PageHeader title={t('tech.sonarqube.settingsTitle')} subtitle={t('tech.sonarqube.settingsSubtitle')} />
      <EnvVariablesTab category="SONARQUBE" />
    </Stack>
  );
}
