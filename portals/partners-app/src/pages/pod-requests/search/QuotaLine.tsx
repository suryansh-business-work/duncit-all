import { useQuery } from '@apollo/client/react';
import Typography from '@mui/material/Typography';
import { useTranslation } from '@duncit/shell';
import { POD_REQUEST_QUOTA, type PodRequestQuota, type PodRequestSide } from '../queries';

/** This month's Pod Request allowance — for a venue it is per venue. */
export function usePodRequestQuota(side: PodRequestSide, venueId: string | null) {
  const { data } = useQuery<{ podPartnerRequestQuota: PodRequestQuota }>(POD_REQUEST_QUOTA, {
    variables: { side, venue_id: venueId },
    skip: side === 'VENUE' && !venueId,
    fetchPolicy: 'cache-and-network',
  });
  return data?.podPartnerRequestQuota ?? null;
}

/** "3 of 10 requests left this month", or that the month's allowance is spent. */
export default function QuotaLine({ quota }: Readonly<{ quota: PodRequestQuota | null }>) {
  const { t } = useTranslation();
  if (!quota) return null;
  const spent = quota.remaining <= 0;
  return (
    <Typography variant="body2" sx={{ color: spent ? 'error.main' : 'text.secondary', fontWeight: 600 }}>
      {spent
        ? t('podRequests.quotaReached', { vars: { limit: quota.limit } })
        : t('podRequests.quotaLeft', { vars: { remaining: quota.remaining, limit: quota.limit } })}
    </Typography>
  );
}
