import { Box, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '@duncit/app-settings';
import EnvAccessGate from './access-gate';
import EnvWorkspace from './workspace';

/**
 * Tech → Environment Variables. Behind an emailed code to the root admin, then
 * a 250px sidebar of every section — overview, the grouped categories, portal
 * mapping and settings — in place of the old tab strips.
 */
export default function EnvironmentPage() {
  const { t } = useTranslation();

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TuneIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {t('shell.nav.environmentVariables')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.environment.pageSubtitle')}
          </Typography>
        </Box>
      </Stack>

      <EnvAccessGate>
        <EnvWorkspace />
      </EnvAccessGate>
    </Stack>
  );
}
