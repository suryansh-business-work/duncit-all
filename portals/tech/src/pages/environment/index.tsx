import { Box, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import EnvVariablesTab from './EnvVariablesTab';
import PortalMappingTab from './PortalMappingTab';
import { useTranslation } from '@duncit/app-settings';

type Section = 'variables' | 'mapping';
type Translate = ReturnType<typeof useTranslation>['t'];

const sections = (t: Translate): DuncitTabItem<Section>[] => [
  { value: 'variables', label: t('tech.common.variables') },
  { value: 'mapping', label: t('tech.environment.portalMapping') },
];

export default function EnvironmentPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<Section>({ items: sections(t), fallback: 'variables' });

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <TuneIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>{t('shell.nav.environmentVariables')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Manage credential entries per category, then map which entries each portal uses.
          </Typography>
        </Box>
      </Stack>

      <DuncitTabs {...tabs} />

      {tabs.value === 'variables' ? <EnvVariablesTab /> : <PortalMappingTab />}
    </Stack>
  );
}
