import { Skeleton, Stack } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

/** The pod page's shape while it loads: top bar, hero, title block, a card. */
export default function PodDetailsSkeleton() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2.5} data-testid="pod-details-skeleton" role="progressbar" aria-busy aria-label={t('mweb.a11y.loading')}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="circular" width={40} height={40} />
        </Stack>
      </Stack>
      <Skeleton variant="rectangular" height={280} sx={{ borderRadius: '24px' }} />
      <Skeleton width="60%" height={36} />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={80} height={32} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" width={120} height={32} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 999 }} />
      </Stack>
      <Skeleton variant="rectangular" height={180} sx={{ borderRadius: '24px' }} />
    </Stack>
  );
}
