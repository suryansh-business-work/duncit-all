import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import TrackingChoicesCard from './TrackingChoicesCard';
import DataExportCard from './DataExportCard';

/** Profile Settings → Privacy & data: tracking choices and a copy of your data. */
export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <Stack data-testid="privacy-page" spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
      <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600 }}>
        {t('privacy.page.title')}
      </Typography>
      <TrackingChoicesCard />
      <DataExportCard />
    </Stack>
  );
}
