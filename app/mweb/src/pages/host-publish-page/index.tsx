import { Navigate } from 'react-router';
import { Skeleton, Stack } from '@mui/material';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { PublishPageCard } from '@duncit/public-page';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';

/**
 * Host Options → Publish Your Host Page: the host's public page, link, QR code
 * and poster — the same Publish card Host Studio shows, on its own page. A
 * host page is always the signed-in host's own, so it needs no picker.
 */
export default function HostPublishPage() {
  const { t } = useTranslation();
  const { me, loading } = useUserInfo();
  const isHost = (me?.roles ?? []).includes('HOST');

  if (!loading && !isHost) return <Navigate to="/" replace />;

  return (
    <Stack spacing={2.5} sx={{ p: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="host-publish-page">
      <StudioPageHeader icon={<PublicRoundedIcon fontSize="small" />} title={t('mweb.studioOptions.publishHost')} />
      {loading ? (
        <Skeleton variant="rounded" height={200} data-testid="host-publish-loading" />
      ) : (
        <PublishPageCard kind="HOST" title={me?.full_name ?? ''} />
      )}
    </Stack>
  );
}
