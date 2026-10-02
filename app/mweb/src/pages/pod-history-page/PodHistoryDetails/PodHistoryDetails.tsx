import {
  coverImageUrl,
  isPodPast,
  participationInputFrom,
  podParticipationActions,
} from '@duncit/utils';
import PodHistoryActions from '../PodHistoryActions';
import { Alert, Box, Card, CardContent, Stack } from '@mui/material';
import { notify } from '../../../components/notify';
import { usePricing } from '../../../hooks/usePricing';
import { useBrandingAssets } from '../../../hooks/useBrandingAssets';
import { podUrl } from '../../../utils/seoUrls';
import { useDateFormat } from '../../../utils/dateFormat';
import { useTranslation } from '../../../i18n/useTranslation';
import SectionHeader from '../../../components/SectionHeader';
import PodHistoryTimeline from '../PodHistoryTimeline';
import PodProductOrdersCard from '../PodProductOrdersCard';
import ReplacementNotice from '../ReplacementNotice';
import { STATUS_CHIP } from '../statusChip';
import type { PodHistoryItem } from '../queries';
import { makeSupportPath, refundLabel } from './supportPath';
import { usePodHistoryDownloads } from './usePodHistoryDownloads';
import PodHistorySummaryCard from './PodHistorySummaryCard';
import PodHistoryTermsLinks from './PodHistoryTermsLinks';

interface Props {
  item: PodHistoryItem;
  /** True once the server says this pod has no Backout attempts left. Absent
   * while that query is still open, which renders the same as "not maxed". */
  backoutMaxed?: boolean;
  backingOut: boolean;
  rejoining: boolean;
  onBackout: () => void;
  onRejoin: () => void;
}

export default function PodHistoryDetails({ item, backoutMaxed = false, backingOut, rejoining, onBackout, onRejoin }: Readonly<Props>) {
  /*
    What this booking may still be offered, and what it may claim.

    From the shared rules rather than from the membership status: a pod that
    has already happened has nothing left to back out of, a booking with no
    refund in play has no refund to report, and after the date the word is
    Visited rather than Joined.
  */
  const gate = podParticipationActions(
    participationInputFrom(item.participation, item.pod?.pod_date_time)
  );
  const { formatDateTime } = useDateFormat();
  const { t } = useTranslation();
  const { format, backoutDeductionPct } = usePricing();
  const { termsUrl } = useBrandingAssets();
  const { invoiceState, ticketState, downloadInvoice, downloadTicket } = usePodHistoryDownloads(item, t);
  const pod = item.pod;
  const isDeleted = !!pod?.is_deleted;
  const imageUrl = coverImageUrl(pod?.pod_images_and_videos);
  const podDetailsPath = pod?.club_slug && pod?.pod_id ? podUrl(pod.club_slug, pod.pod_id) : '';
  // The pod's own start time, which is where the server closes rejoin too — an
  // end-time window offered the button for hours after rejoin had stopped working.
  const podPast = isPodPast(pod?.pod_date_time);
  // Rejoin is offered only for a backed-out booking whose pod has not started
  // and is not deleted — the free, no-payment path back in.
  const canRejoin = item.status === 'BACKED_OUT' && !isDeleted && !!pod?.id && !podPast;
  // "Visited" once they were checked in at a pod that has happened — never on
  // the clock alone. Resolved once here so the chip stays branch-free.
  const visited = gate.joinedLabelKind === 'VISITED' && item.status === 'JOINED';
  const statusLabel = visited
    ? t('mweb.podHistory.statusVisited')
    : t(STATUS_CHIP[item.status].label);
  const refundText = refundLabel(gate.refundStatus, t);
  const priceCaption =
    pod?.pod_type === 'FREE'
      ? t('mweb.podHistory.freePod')
      : t('mweb.podHistory.paidPod', { vars: { amount: format(pod?.pod_amount ?? 0) } });
  const dateText = pod?.pod_date_time
    ? formatDateTime(pod.pod_date_time)
    : t('mweb.podHistory.dateNotAvailable');

  return (
    <Stack spacing={1.5} data-testid="pod-history-details" sx={{ width: '100%' }}>
      <PodHistorySummaryCard
        item={item}
        imageUrl={imageUrl}
        statusLabel={statusLabel}
        refundText={refundText}
        showRefundState={gate.showRefundState}
        coinsRefunded={gate.coinsRefunded}
        dateText={dateText}
        priceCaption={priceCaption}
      />

      <Card data-testid="ph-actions-card">
        <CardContent>
          <Box sx={{ mb: 1.5 }}>
            <SectionHeader testId="ph-actions-header" title={t('mweb.podHistory.actions')} />
          </Box>
          <PodHistoryActions
            item={item}
            isDeleted={isDeleted}
            podDetailsPath={podDetailsPath}
            supportPath={makeSupportPath(item, gate.refundStatus, t)}
            canBackout={gate.canBackout}
            backoutMaxed={backoutMaxed}
            showRefundState={gate.showRefundState}
            refundLabel={refundText}
            canRejoin={canRejoin}
            backingOut={backingOut}
            rejoining={rejoining}
            ticketLoading={!pod?.id || ticketState.loading}
            invoiceLoading={invoiceState.loading}
            onBackout={onBackout}
            onRejoin={onRejoin}
            onDownloadTicket={downloadTicket}
            onDownloadInvoice={downloadInvoice}
            onShowRefundStatus={() =>
              notify(t('mweb.podHistory.refundStatusToast', { vars: { status: refundText } }), 'info')
            }
          />
          {/* Both of these promise something that is still to come, so neither
              belongs on a pod that has already happened: nobody can fill that
              seat now, and the refund question is already settled. */}
          {!podPast && (canRejoin || item.status === 'BACKOUT_IN_PROCESS') && (
            <ReplacementNotice deductionPct={backoutDeductionPct} />
          )}
          {!podPast && gate.refundStatus === 'PENDING' && (
            <Alert severity="info" data-testid="ph-refund-pending" sx={{ mt: 1.5 }}>
              {t('mweb.podHistory.refundPendingNote')}
            </Alert>
          )}
        </CardContent>
      </Card>

      <PodProductOrdersCard podId={pod?.id} />

      <Card data-testid="ph-timeline-card">
        <CardContent>
          <Box sx={{ mb: 1.5 }}>
            <SectionHeader testId="ph-timeline-header" title={t('mweb.podHistory.timeline')} />
          </Box>
          <PodHistoryTimeline item={item} />
        </CardContent>
      </Card>

      <PodHistoryTermsLinks termsUrl={termsUrl} />
    </Stack>
  );
}
