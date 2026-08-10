import { useQuery } from '@apollo/client';
import {
  StudioPodsSection,
  summarizeStudioPods,
  VENUE_STUDIO_PODS,
  type StudioPod,
} from '../../components/studio-pods';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * "Pods hosted on your Venue" — every pod booked at the owner's venue with the
 * shared figures strip above it.
 *
 * The venue side has no server-side roll-up query, so the same shape is derived
 * from the list: every figure but collected revenue is derivable from a pod row,
 * and revenue is simply not shown here rather than guessed at.
 */
export default function VenuePodsSection({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const { data, loading, error, refetch } = useQuery(VENUE_STUDIO_PODS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });

  const pods: StudioPod[] = data?.studioPods ?? [];
  const summary = summarizeStudioPods(pods, currency);

  return (
    <StudioPodsSection
      title={t('mweb.studioPods.venueTitle')}
      subtitle={t('mweb.studioPods.venueSubtitle')}
      scopeLabel={t('mweb.studioPods.venues')}
      emptyText={t('mweb.studioPods.venueEmpty')}
      pods={pods}
      summary={summary}
      loading={loading && !data}
      failed={!!error && !data}
      onRetry={() => {
        refetch().catch(() => undefined);
      }}
    />
  );
}
