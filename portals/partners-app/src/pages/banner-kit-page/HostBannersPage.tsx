import { Stack } from '@mui/material';
import { PodBannersPanel, useTranslation } from '@duncit/shell';
import { useUserData } from '@duncit/user-context';
import StudioPageHeader from '../../components/studio/StudioPageHeader';

/** Host Options > Banners: Make banners for the pods the signed-in host runs next. */
export default function HostBannersPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="host-banners-page">
      <StudioPageHeader title={t('mweb.studioOptions.banners')} hint={t('mweb.studioOptions.bannersHint')} />
      {/* podsTable's host filter is the host's ACCOUNT id; it waits until the user is in. */}
      <PodBannersPanel filter={{ field: 'host_user_id', value: user?.user_id ?? '' }} />
    </Stack>
  );
}
