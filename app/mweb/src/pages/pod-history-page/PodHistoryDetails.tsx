import { useLazyQuery } from '@apollo/client';
import { podParticipationActions } from '@duncit/utils';
import PodHistoryActions from './PodHistoryActions';
import { useTranslation } from '../../i18n/useTranslation';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import EventIcon from '@mui/icons-material/Event';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ReplayIcon from '@mui/icons-material/Replay';
import RuleIcon from '@mui/icons-material/Rule';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { notify } from '../../components/notify';
import { usePricing } from '../../hooks/usePricing';
import { parseApiError } from '../../utils/parseApiError';
import { podUrl } from '../../utils/seoUrls';
import { isPodActive } from '../../utils/podStatus';
import { useDateFormat } from '../../utils/dateFormat';
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
  backingOut: boolean;
  rejoining: boolean;
  onBackout: () => void;
  onRejoin: () => void;
}

const refundLabel: Record<PodHistoryItem['refund_status'], string> = {
  NONE: 'Not started',
  PENDING: 'Criteria pending',
  PROCESSED: 'Refund initiated',
  NOT_ELIGIBLE: 'Not initiated',
};

const makeSupportPath = (item: PodHistoryItem) => {
  const title = item.pod?.pod_title ?? 'Pod';
  const params = new URLSearchParams({
    category: 'PAYMENT',
    subject: `Support - ${title}`,
    message: `I need help with my pod booking. Pod: ${title}. Membership: ${item.id}. Refund status: ${refundLabel[item.refund_status]}.`,
  });
  if (item.pod?.id) {
    params.set('podId', item.pod.id);
    params.set('podTitle', title);
  }
  return `/support/tickets?${params.toString()}`;
};

export default function PodHistoryDetails({ item, backingOut, rejoining, onBackout, onRejoin }: Readonly<Props>) {
  const { t } = useTranslation();
  /*
    What this booking may still be offered, and what it may claim.

    From the shared rules rather than from the membership status: a pod that
    has already happened has nothing left to back out of, a booking nobody
    asked a refund for has no refund to report, and after the date the word is
    Visited rather than Joined.
  */
  const gate = podParticipationActions({
    joinedAt: item.joined_at,
    podDateTime: item.pod?.pod_date_time,
    cancelledBy: item.pod_cancelled_by ?? null,
    backouts: item.backouts ?? [],
  });
  const { formatDateTime } = useDateFormat();
  const { format, backoutDeductionPct } = usePricing();
  const [loadInvoice, invoiceState] = useLazyQuery(POD_HISTORY_INVOICE_PDF, { fetchPolicy: 'network-only' });
  const [loadTicketForPod] = useLazyQuery(POD_HISTORY_TICKET_FOR_POD, { fetchPolicy: 'network-only' });
  const [loadTicketPdf, ticketState] = useLazyQuery(POD_HISTORY_TICKET_PDF, { fetchPolicy: 'network-only' });
  const pod = item.pod;
  const isDeleted = !!pod?.is_deleted;
  const imageUrl = pod?.pod_images_and_videos?.[0]?.url;
  const podDetailsPath = pod?.club_slug && pod?.pod_id ? podUrl(pod.club_slug, pod.pod_id) : '';
  // Rejoin is offered only for a backed-out booking whose pod is still active (not
  // completed/ended) and not deleted — the free, no-payment path back in.
  const canRejoin = item.status === 'BACKED_OUT' && !isDeleted && !!pod?.id && isPodActive(pod?.pod_date_time, pod?.pod_end_date_time);

  const downloadInvoice = async () => {
    if (!item.payment_id) return;
    try {
      const { data } = await loadInvoice({ variables: { id: item.payment_id } });
      const b64 = data?.paymentInvoicePdfBase64;
      if (!b64) throw new Error('Invoice not available');
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
      if (!ticket?.id) throw new Error('Ticket not available for this booking');
      const { data } = await loadTicketPdf({ variables: { id: ticket.id } });
      const b64 = data?.eventTicketPdfBase64;
      if (!b64) throw new Error('Ticket not available');
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
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Avatar src={imageUrl || undefined} variant="rounded" sx={{ width: { xs: '100%', sm: 96 }, height: 96, borderRadius: '16px', bgcolor: 'action.hover' }}>
              <EventIcon />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75, flexWrap: 'wrap' }}>
                {/* "Visited" once the pod has happened — "Joined" is a promise
                    about something still ahead. */}
                <Chip
                  size="small"
                  color={STATUS_CHIP[item.status].color}
                  label={
                    gate.joinedLabelKind === 'VISITED' && item.status === 'JOINED'
                      ? 'Visited'
                      : STATUS_CHIP[item.status].label
                  }
                />
                {/* No refund state at all unless one was actually asked for. */}
                {gate.showRefundState && (
                  <Chip size="small" variant="outlined" label={`Refund: ${refundLabel[item.refund_status]}`} />
                )}
                {(item.seats ?? 1) > 1 && (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={`${item.seats} seats`}
                  />
                )}
              </Stack>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                {pod?.pod_title ?? 'Pod details'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pod?.pod_date_time ? formatDateTime(pod.pod_date_time) : 'Date not available'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pod?.pod_type === 'FREE' ? 'Free pod' : `Paid pod ${format(pod?.pod_amount ?? 0)}`}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Actions</Typography>
          <PodHistoryActions
            item={item}
            isDeleted={isDeleted}
            podDetailsPath={podDetailsPath}
            supportPath={makeSupportPath(item)}
            canBackout={gate.canBackout}
            showRefundState={gate.showRefundState}
            refundLabel={refundLabel[item.refund_status]}
            canRejoin={canRejoin}
            backingOut={backingOut}
            rejoining={rejoining}
            ticketLoading={!pod?.id || ticketState.loading}
            invoiceLoading={invoiceState.loading}
            onBackout={onBackout}
            onRejoin={onRejoin}
            onDownloadTicket={downloadTicket}
            onDownloadInvoice={downloadInvoice}
            onShowRefundStatus={() => notify(`Refund status: ${refundLabel[item.refund_status]}`, 'info')}
          />
          {(canRejoin || item.status === 'BACKOUT_IN_PROCESS') && (
            <ReplacementNotice deductionPct={backoutDeductionPct} />
          )}
          {item.status === 'BACKED_OUT' && item.refund_status === 'PENDING' && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Refund is waiting for criteria completion. Support can help if the status looks wrong.
            </Alert>
          )}
        </CardContent>
      </Card>

      <PodProductOrdersCard podId={pod?.id} />

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Timeline</Typography>
          <PodHistoryTimeline item={item} />
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button component={RouterLink} to="/policies/backout-terms" size="small" startIcon={<RuleIcon />}>Backout Terms &amp; Conditions</Button>
        <Button href="https://duncit.com/terms" target="_blank" rel="noopener" size="small">General Terms</Button>
      </Stack>
    </Stack>
  );
}