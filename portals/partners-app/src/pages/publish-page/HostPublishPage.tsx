import { Stack } from '@mui/material';
import { PublishPageCard } from '@duncit/public-page';
import { useTranslation } from '@duncit/shell';
import { useUserData } from '@duncit/user-context';
import StudioPageHeader from '../../components/studio/StudioPageHeader';

/**
 * Publish Your Host Page — the same card Host Studio's dashboard carries. A
 * host page is always the signed-in host's own, and `/host/*` is already kept
 * to hosts by SectionGate.
 */
export default function HostPublishPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  return (
    <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 760 }} data-testid="host-publish-page">
      <StudioPageHeader
        title={t('mweb.studioOptions.publishHost')}
        hint={t('mweb.studioOptions.publishHostHint')}
      />
      <PublishPageCard kind="HOST" title={user?.full_name ?? ''} />
    </Stack>
  );
}
