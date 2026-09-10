import { useNavigate } from 'react-router';
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import ShopIcon from '@mui/icons-material/Shop';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { AppBuildSettings } from '../queries';

/**
 * Whether a build can be pushed to Google Play from here. The credential
 * itself lives on the GOOGLE_PLAY env entry, where it can be tested; this card
 * only says whether one is there, so the reason a push refuses is visible
 * before anyone presses it.
 */
export default function PlayStoreCard({ settings }: Readonly<{ settings: AppBuildSettings }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = settings.play_store_configured ? (
    <Alert severity="success">
      {t('tech.appBuilds.playSettingsConfigured', { vars: { package: settings.play_package_name } })}
    </Alert>
  ) : (
    <Alert severity="warning">{t('tech.appBuilds.playSettingsNotConfigured')}</Alert>
  );

  return (
    <Card sx={{ maxWidth: 640, mt: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ShopIcon fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('tech.appBuilds.playSettingsTitle')}
            </Typography>
          </Stack>
          {status}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.appBuilds.playSettingsHint')}
          </Typography>
          <Box>
            <DuncitButton variant="outlined" size="small" onClick={() => navigate('/')}>
              {t('tech.appBuilds.playOpenEnvironment')}
            </DuncitButton>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
