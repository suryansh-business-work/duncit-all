import { Alert, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteRow } from '../queries/sites';
import ReelsManager from '../../website/reels/ReelsManager';
import ReelSettingsPage from '../../website/reel-settings/ReelSettingsPage';

/**
 * The reels this website's home page plays (the Reel Slider block), managed
 * from the website itself. Reels belong to one of the Duncit sites, so a
 * website without one has none to manage.
 */
export default function ReelsTab({ site }: Readonly<{ site: CmsSiteRow }>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={3}>
      <Typography color="text.secondary">{t('websiteApp.cms.reels.intro')}</Typography>
      {site.legacy_site ? <ReelsManager key={site.legacy_site} site={site.legacy_site} /> : <Alert severity="info">{t('websiteApp.cms.reels.noSite')}</Alert>}
      <Divider />
      <ReelSettingsPage embedded />
    </Stack>
  );
}
