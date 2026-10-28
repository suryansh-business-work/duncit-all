import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { PageHeader } from '@duncit/ui';
import ConfidenceSettingsEditor from './ConfidenceSettingsEditor';
import UnitRetentionEditor from './UnitRetentionEditor';

/** Tests → Settings: how the confidence score is weighed, and how long unit test detail is kept. */
export default function TestsSettingsPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 960 }}>
      <PageHeader title={t('tests.settings.title')} subtitle={t('tests.settings.subtitle')} />
      <ConfidenceSettingsEditor />
      <UnitRetentionEditor />
    </Stack>
  );
}
