import { useQuery } from '@apollo/client/react';
import {
  StudioPodsSection,
  EMPTY_STUDIO_SUMMARY,
  VENUE_STUDIO_PODS,
  type StudioPod,
} from '../../components/studio-pods';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * "Pods hosted on your Venue" — every pod booked at the owner's venue with the
 * shared figures strip above it.
 *
 * The figures come from the server (venuePodsSummary), computed over EVERY
 * approved booking while the list stays capped — the client used to fold the
 * capped list and report a total of 500 for a busy venue.
 */
export default function VenuePodsSection({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(VENUE_STUDIO_PODS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });

  const pods: StudioPod[] = data?.studioPods ?? [];
  const summary = data?.studioSummary ?? EMPTY_STUDIO_SUMMARY;

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
