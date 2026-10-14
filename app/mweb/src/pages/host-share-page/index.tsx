import { Navigate } from 'react-router';
import { Skeleton, Stack } from '@mui/material';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import StudioPageHeader from '../../components/StudioPageHeader';
import HostShareCard from '../host-manage-page/HostShareCard';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';

/**
 * Host Options → Host Share: every completion payout the host has earned, with
 * its breakdown and status — moved off Your Pods so that page lists pods only.
 */
export default function HostSharePage() {
  const { t } = useTranslation();
  const { me, loading } = useUserInfo();
  const isHost = (me?.roles ?? []).includes('HOST');

  if (!loading && !isHost) return <Navigate to="/" replace />;

  return (
    <Stack spacing={2.5} sx={{ p: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="host-share-page">
      <StudioPageHeader icon={<PaidRoundedIcon fontSize="small" />} title={t('mweb.studioOptions.hostShare')} />
      {loading ? <Skeleton variant="rounded" height={200} data-testid="host-share-page-loading" /> : <HostShareCard />}
    </Stack>
  );
}
