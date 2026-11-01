import { Stack } from '@mui/material';
import { BannerKitPanel, useTranslation } from '@duncit/shell';
import StudioPageHeader from '../../components/studio/StudioPageHeader';

/**
 * Host Options > Banner Kit: what the signed-in host's pod banners are made
 * from. Always their own profile; `/host/*` is already kept to hosts by
 * SectionGate, and the server lets only the host (or the Hosts console) save it.
 */
export default function HostBannerKitPage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="host-banner-kit-page">
      <StudioPageHeader title={t('mweb.studioOptions.bannerKit')} hint={t('mweb.studioOptions.hostBannerKitHint')} />
      <BannerKitPanel entity="HOST" mode="owner" />
    </Stack>
  );
}
