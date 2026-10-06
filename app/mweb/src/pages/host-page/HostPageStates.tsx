import { Skeleton, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import PersonOffIcon from '@mui/icons-material/PersonOffOutlined';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from '../../i18n/useTranslation';

/** The page's shape while the host loads. */
export function HostPageSkeleton() {
  return (
    <Stack data-testid="host-page-loading" spacing={2} sx={{ pt: 2, alignItems: 'center' }}>
      <Skeleton variant="circular" width={88} height={88} />
      <Skeleton width="60%" height={32} />
      <Skeleton width="40%" />
      <Skeleton variant="rounded" width="100%" height={160} />
    </Stack>
  );
}

/** The host could not be loaded — a retry, since the link itself may be fine. */
export function HostPageError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <EmptyState
      testId="host-page-error"
      icon={<ErrorOutlineIcon />}
      title={t('publicPage.hostPage.loadFailed')}
      actionLabel={t('publicPage.hostPage.retry')}
      onAction={onRetry}
    />
  );
}

/** No such user, or not a host — a host page exists only for hosts. */
export function HostPageNotFound() {
  const { t } = useTranslation();
  return <EmptyState testId="host-page-not-found" icon={<PersonOffIcon />} title={t('publicPage.hostPage.notFound')} />;
}
