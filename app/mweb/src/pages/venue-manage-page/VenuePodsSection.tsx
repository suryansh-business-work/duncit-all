import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import type { VenueCancelPodResult } from '@duncit/utils';
import {
  StudioPodsSection,
  EMPTY_STUDIO_SUMMARY,
  VENUE_STUDIO_PODS,
  type StudioPod,
} from '../../components/studio-pods';
import { notifySuccess } from '../../components/notify';
import VenueCancelPodDialog from './VenueCancelPodDialog';
import VenuePodDetailDialog from './VenuePodDetailDialog';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  venueId: string;
  /** Fired after a pod is cancelled, so the page can refresh what it derived
   * from the venue's bookings (the slot-earnings strip). */
  onPodsChanged?: () => Promise<unknown>;
}

/**
 * "Pods hosted on your Venue" — every pod booked at the owner's venue with the
 * shared figures strip above it, plus the two things only the venue side can
 * do with a row: open its detail sheet, and cancel it.
 *
 * The figures come from the server (venuePodsSummary), computed over EVERY
 * approved booking while the list stays capped — the client used to fold the
 * capped list and report a total of 500 for a busy venue.
 */
export default function VenuePodsSection({ venueId, onPodsChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [openPod, setOpenPod] = useState<StudioPod | null>(null);
  const [podToCancel, setPodToCancel] = useState<StudioPod | null>(null);
  const { data, loading, error, refetch } = useQuery<any>(VENUE_STUDIO_PODS, {
    variables: { venue_id: venueId },
    skip: !venueId,
    fetchPolicy: 'cache-and-network',
  });

  const pods: StudioPod[] = data?.studioPods ?? [];
  const summary = data?.studioSummary ?? EMPTY_STUDIO_SUMMARY;

  // Every number in the line comes from the server — the refund count and the
  // venue's Account Health after the penalty.
  const handleCancelled = async (result: VenueCancelPodResult) => {
    setPodToCancel(null);
    const refunds =
      result.refunded_count === 1
        ? t('mweb.venuePods.refundedOne')
        : t('mweb.venuePods.refundedMany', { vars: { count: result.refunded_count } });
    notifySuccess(
      t('mweb.venuePods.cancelled', { vars: { refunds, score: result.venue_health_score } })
    );
    await refetch();
    await onPodsChanged?.();
  };

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
        onOpenPod={setOpenPod}
        onCancelPod={setPodToCancel}
      />
      <VenuePodDetailDialog
        pod={openPod}
        currencySymbol={summary.currency_symbol}
        onClose={() => setOpenPod(null)}
      />
      <VenueCancelPodDialog
        pod={podToCancel}
        onClose={() => setPodToCancel(null)}
        onCancelled={handleCancelled}
      />
    </>
  );
}
