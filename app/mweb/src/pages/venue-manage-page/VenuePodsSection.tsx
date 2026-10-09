import { useQuery } from '@apollo/client/react';
import {
  StudioPodsSection,
  EMPTY_STUDIO_SUMMARY,
  VENUE_STUDIO_PODS,
  type StudioPod,
} from '../../components/studio-pods';
import { useVenuePodActions } from './useVenuePodActions';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  venueId: string;
  /** Fired after a pod is cancelled, so the page can refresh what it derived
   * from the venue's bookings (the slot-earnings strip). */
  onPodsChanged?: () => Promise<unknown>;
}

/**
 * "Pods hosted on your Venue" — every pod booked at the owner's venue with the
 * shared figures strip above it, plus the things only the venue side can do
 * with a row (open its detail sheet, cancel it, ask for a change).
 *
 * The figures come from the server (venuePodsSummary), computed over EVERY
 * approved booking while the list stays capped — the client used to fold the
 * capped list and report a total of 500 for a busy venue.
 */
export default function VenuePodsSection({ venueId, onPodsChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(VENUE_STUDIO_PODS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });

  const pods: StudioPod[] = data?.studioPods ?? [];
  const summary = data?.studioSummary ?? EMPTY_STUDIO_SUMMARY;
  const actions = useVenuePodActions({ currencySymbol: summary.currency_symbol, refetch, onPodsChanged });

  return (
    <>
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
        {...actions.rowActions}
      />
      {actions.dialogs}
    </>
  );
}
