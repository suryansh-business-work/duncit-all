import { useLazyQuery } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import EventIcon from '@mui/icons-material/Event';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RuleIcon from '@mui/icons-material/Rule';
import { notify } from '../../components/notify';
import { usePricing } from '../../hooks/usePricing';
import { parseApiError } from '../../utils/parseApiError';
import { podUrl } from '../../utils/seoUrls';
import { useDateFormat } from '../../utils/dateFormat';
import PodHistoryTimeline from './PodHistoryTimeline';
import { POD_HISTORY_INVOICE_PDF, type PodHistoryItem } from './queries';

interface Props {
  item: PodHistoryItem;
  backingOut: boolean;
  onBackout: () => void;
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
    subject: `Refund support - ${title}`,
    message: `I need help with my pod history. Pod: ${title}. Membership: ${item.id}. Refund status: ${refundLabel[item.refund_status]}.`,
  });
  return `/support?${params.toString()}`;
};

export default function PodHistoryDetails({ item, backingOut, onBackout }: Props) {
  const { formatDateTime } = useDateFormat();
  const { format } = usePricing();
  const [loadInvoice, invoiceState] = useLazyQuery(POD_HISTORY_INVOICE_PDF, { fetchPolicy: 'network-only' });
  const pod = item.pod;
  const imageUrl = pod?.pod_images_and_videos?.[0]?.url;
  const podDetailsPath = pod?.club_slug && pod?.pod_id ? podUrl(pod.club_slug, pod.pod_id) : '';

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

  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Avatar src={imageUrl || undefined} variant="rounded" sx={{ width: { xs: '100%', sm: 96 }, height: 96, borderRadius: 3, bgcolor: 'action.hover' }}>
              <EventIcon />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75, flexWrap: 'wrap' }}>
                <Chip size="small" color={item.status === 'BACKED_OUT' ? 'warning' : 'success'} label={item.status === 'BACKED_OUT' ? 'Backed out' : 'Joined'} />
                <Chip size="small" variant="outlined" label={`Refund: ${refundLabel[item.refund_status]}`} />
              </Stack>
              <Typography variant="h6" fontWeight={950} sx={{ lineHeight: 1.1 }}>
                {pod?.pod_title ?? 'Pod details'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pod?.pod_date_time ? formatDateTime(pod.pod_date_time) : 'Date not available'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pod?.pod_type?.includes('FREE') ? 'Free pod' : `Paid pod ${format(pod?.pod_amount ?? 0)}`}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={950} gutterBottom>Actions</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Button component={RouterLink} to={podDetailsPath || '#'} disabled={!podDetailsPath} variant="contained" endIcon={<ArrowForwardIcon />}>
              Go to Pod Details
            </Button>
            <Button onClick={onBackout} disabled={item.status !== 'JOINED' || backingOut} color="error" variant="outlined" startIcon={<RestartAltIcon />}>
              {backingOut ? 'Backing out...' : 'Backout Pod'}
            </Button>
            <Button variant="outlined" startIcon={<ReceiptLongIcon />} onClick={() => notify(`Refund status: ${refundLabel[item.refund_status]}`, 'info')}>
              Refund Status: {refundLabel[item.refund_status]}
            </Button>
            <Button onClick={downloadInvoice} disabled={!item.payment_id || invoiceState.loading} variant="outlined" startIcon={<ReceiptLongIcon />}>
              {invoiceState.loading ? 'Downloading...' : 'Invoice'}
            </Button>
            <Button component={RouterLink} to={makeSupportPath(item)} variant="outlined" startIcon={<ContactSupportIcon />}>
              Contact Support
            </Button>
          </Stack>
          {item.status === 'BACKED_OUT' && item.refund_status === 'PENDING' && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Refund is waiting for criteria completion. Support can help if the status looks wrong.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={950} gutterBottom>Timeline</Typography>
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