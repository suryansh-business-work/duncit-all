import { useLazyQuery } from '@apollo/client';
import {
  isPodPast,
  participationInputFrom,
  podParticipationActions,
  type PodRefundStatus,
} from '@duncit/utils';
import PodHistoryActions from './PodHistoryActions';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import RuleIcon from '@mui/icons-material/Rule';
import { notify } from '../../components/notify';
import { usePricing } from '../../hooks/usePricing';
import { parseApiError } from '../../utils/parseApiError';
import { podUrl } from '../../utils/seoUrls';
import { useDateFormat } from '../../utils/dateFormat';
import { fallbackT, type Translate } from '../../i18n/fallback';
import { useTranslation } from '../../i18n/useTranslation';
import PodHistoryTimeline from './PodHistoryTimeline';
import PodProductOrdersCard from './PodProductOrdersCard';
import ReplacementNotice from './ReplacementNotice';
import { STATUS_CHIP } from './statusChip';
import {
  POD_HISTORY_INVOICE_PDF,
  POD_HISTORY_TICKET_FOR_POD,
  POD_HISTORY_TICKET_PDF,
  type PodHistoryItem,
} from './queries';

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

/** Translation keys for each refund state — the words live in @duncit/i18n so
 * mWeb and the native app cannot describe the same refund differently. */
const REFUND_KEY: Record<PodRefundStatus, string> = {
  NONE: 'mweb.podHistory.refundNotStarted',
  PENDING: 'mweb.podHistory.refundPending',
  PROCESSED: 'mweb.podHistory.refundProcessed',
  NOT_ELIGIBLE: 'mweb.podHistory.refundNotEligible',
};

const refundLabel = (status: PodRefundStatus, t: Translate = fallbackT) =>
  t(REFUND_KEY[status] ?? REFUND_KEY.NONE);

const makeSupportPath = (item: PodHistoryItem, refundStatus: PodRefundStatus, t: Translate) => {
  const title = item.pod?.pod_title ?? t('mweb.podHistory.pod');
  const params = new URLSearchParams({
    category: 'PAYMENT',
    subject: `Support - ${title}`,
    message: `I need help with my pod booking. Pod: ${title}. Membership: ${item.id}. Refund status: ${refundLabel(refundStatus, t)}.`,
  });
  if (item.pod?.id) {
    params.set('podId', item.pod.id);
    params.set('podTitle', title);
  }
  return `/support/tickets?${params.toString()}`;
};

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
  const [loadInvoice, invoiceState] = useLazyQuery(POD_HISTORY_INVOICE_PDF, { fetchPolicy: 'network-only' });
  const [loadTicketForPod] = useLazyQuery(POD_HISTORY_TICKET_FOR_POD, { fetchPolicy: 'network-only' });
  const [loadTicketPdf, ticketState] = useLazyQuery(POD_HISTORY_TICKET_PDF, { fetchPolicy: 'network-only' });
  const pod = item.pod;
  const isDeleted = !!pod?.is_deleted;
  const imageUrl = pod?.pod_images_and_videos?.[0]?.url;
  const podDetailsPath = pod?.club_slug && pod?.pod_id ? podUrl(pod.club_slug, pod.pod_id) : '';
  // The pod's own start time, which is where the server closes rejoin too — an
  // end-time window offered the button for hours after rejoin had stopped working.
  const podPast = isPodPast(pod?.pod_date_time);
  // Rejoin is offered only for a backed-out booking whose pod has not started
  // and is not deleted — the free, no-payment path back in.
  const canRejoin = item.status === 'BACKED_OUT' && !isDeleted && !!pod?.id && !podPast;
  // "Visited" once the pod has happened — "Joined" is a promise about something
  // still ahead. Resolved once here so the chip stays branch-free.
  const visited = gate.joinedLabelKind === 'VISITED' && item.status === 'JOINED';
  const statusLabel = visited
    ? t('mweb.podHistory.statusVisited')
    : t(STATUS_CHIP[item.status].label);
  const refundText = refundLabel(gate.refundStatus, t);
  const priceCaption =
    pod?.pod_type === 'FREE'
      ? t('mweb.podHistory.freePod')
      : t('mweb.podHistory.paidPod', { vars: { amount: format(pod?.pod_amount ?? 0) } });

  const downloadInvoice = async () => {
    if (!item.payment_id) return;
    try {
      const { data } = await loadInvoice({ variables: { id: item.payment_id } });
      const b64 = data?.paymentInvoicePdfBase64;
      if (!b64) throw new Error(t('mweb.checkout.errorInvoiceUnavailable'));
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${b64}`;
      link.download = `pod-invoice-${item.payment_id}.pdf`;
      link.click();
    } catch (error) {
      notify(parseApiError(error), 'error');
    }
  };

  const downloadTicket = async () => {
    if (!pod?.id) return;
    try {
      const { data: tData } = await loadTicketForPod({ variables: { podId: pod.id } });
      const ticket = tData?.myEventTicketForPod;
      if (!ticket?.id) throw new Error(t('mweb.podHistory.ticketNotAvailableForBooking'));
      const { data } = await loadTicketPdf({ variables: { id: ticket.id } });
      const b64 = data?.eventTicketPdfBase64;
      if (!b64) throw new Error(t('mweb.checkout.errorTicketUnavailable'));
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${b64}`;
      link.download = `ticket-and-invoice-${ticket.ticket_code}.pdf`;
      link.click();
    } catch (error) {
      notify(parseApiError(error), 'error');
    }
  };

  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {/* The tour's first step. It lives here and not on the history LIST
          because the ticket and back-out controls only exist on this page — and
          a tour that resolves on the list would open there, one step long, and
          record itself as shown. */}
      <Card data-tour="booking-summary">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
            alignItems: { sm: 'center' }
          }}>
            <Avatar src={imageUrl || undefined} variant="rounded" sx={{ width: { xs: '100%', sm: 96 }, height: 96, borderRadius: '16px', bgcolor: 'action.hover' }}>
              <EventIcon />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  mb: 0.75,
                  flexWrap: 'wrap'
                }}>
                {/* "Visited" once the pod has happened — "Joined" is a promise
                    about something still ahead. */}
                <Chip size="small" color={STATUS_CHIP[item.status].color} label={statusLabel} />
                {/* No refund state at all unless one is actually in play, and
                    the word comes from the request rather than the booking —
                    the booking's own copy is never written for a partial. */}
                {gate.showRefundState && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t('mweb.podHistory.refundChip', { vars: { status: refundText } })}
                  />
                )}
                {gate.coinsRefunded > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t('mweb.coin.refundCoins')}: ${gate.coinsRefunded}`}
                  />
                )}
                {(item.seats ?? 1) > 1 && (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={t('mweb.podHistory.seatsChip', { vars: { count: item.seats ?? 1 } })}
                  />
                )}
              </Stack>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.1
                }}>
                {pod?.pod_title ?? t('mweb.podHistory.podDetailsTitle')}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {pod?.pod_date_time
                  ? formatDateTime(pod.pod_date_time)
                  : t('mweb.podHistory.dateNotAvailable')}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {priceCaption}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{
            fontWeight: 700
          }}>
            {t('mweb.podHistory.actions')}
          </Typography>
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
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {t('mweb.podHistory.refundPendingNote')}
            </Alert>
          )}
        </CardContent>
      </Card>

      <PodProductOrdersCard podId={pod?.id} />

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{
            fontWeight: 700
          }}>
            {t('mweb.podHistory.timeline')}
          </Typography>
          <PodHistoryTimeline item={item} />
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        <Button component={RouterLink} to="/policies/backout-terms" size="small" startIcon={<RuleIcon />}>
          {t('mweb.podHistory.backoutTerms')}
        </Button>
        <Button href="https://duncit.com/terms" target="_blank" rel="noopener" size="small">
          {t('mweb.podHistory.generalTerms')}
        </Button>
      </Stack>
    </Stack>
  );
}