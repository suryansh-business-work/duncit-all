import { Navigate } from 'react-router';
import { Skeleton, Stack } from '@mui/material';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import StudioPageHeader from '../../components/StudioPageHeader';
import HostApplyBanner from '../host-apply-page/HostApplyBanner';
import HostCategoriesCard from '../host-apply-page/HostCategoriesCard';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';

/**
 * Host Options → Your Categories: the categories the host is approved for, and
 * the way to apply for another — moved off Your Pods so that page lists pods only.
 */
export default function HostCategoriesPage() {
  const { t } = useTranslation();
  const { me, loading } = useUserInfo();
  const isHost = (me?.roles ?? []).includes('HOST');

  if (!loading && !isHost) return <Navigate to="/" replace />;

  return (
    <Stack spacing={2.5} sx={{ p: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="host-categories-page">
      <StudioPageHeader icon={<CategoryRoundedIcon fontSize="small" />} title={t('mweb.studioOptions.hostCategories')} />
      {loading ? (
        <Skeleton variant="rounded" height={160} data-testid="host-categories-page-loading" />
      ) : (
        <>
          <HostCategoriesCard />
          <HostApplyBanner />
        </>
      )}
    </Stack>
  );
}
