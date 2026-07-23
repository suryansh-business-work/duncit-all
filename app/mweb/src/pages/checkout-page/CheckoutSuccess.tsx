import { gql, useLazyQuery } from '@apollo/client';
import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import DownloadIcon from '@mui/icons-material/Download';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GoogleIcon from '@mui/icons-material/Google';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { alpha, useTheme } from '@mui/material/styles';
import PaymentLottie from '../../components/PaymentLottie';
import ConfettiOverlay from '../../components/ConfettiOverlay';
import { notify } from '../../components/notify';
import { formatMoney } from './checkoutMath';
import { parseApiError } from '../../utils/parseApiError';
import { useDateFormat } from '../../utils/dateFormat';

const INVOICE_PDF = gql`
  query CheckoutInvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`;

const MY_TICKET_FOR_POD = gql`
  query CheckoutTicketForPod($podId: ID!) {
    myEventTicketForPod(pod_doc_id: $podId) {
      id
      ticket_code
    }
  }
`;

const TICKET_PDF = gql`
  query CheckoutTicketPdf($id: ID!) {
    eventTicketPdfBase64(ticket_doc_id: $id)
  }
`;

interface Props {
  payment: any;
  pod?: any;
  onHome: () => void;
  onProfile: () => void;
  /** Label for the primary action (defaults to "My Profile"; the product
   * checkout routes to "My Orders"). */
  profileLabel?: string;
}

export default function CheckoutSuccess({ payment, pod, onHome, onProfile, profileLabel = 'My Profile' }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [confetti, setConfetti] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [loadInvoice, { loading: invoiceLoading }] = useLazyQuery(INVOICE_PDF, { fetchPolicy: 'network-only' });
  const [loadTicketForPod] = useLazyQuery(MY_TICKET_FOR_POD, { fetchPolicy: 'network-only' });
  const [loadTicketPdf, { loading: ticketLoading }] = useLazyQuery(TICKET_PDF, { fetchPolicy: 'network-only' });
  const { formatDateTime } = useDateFormat();
  const paidAt = payment.paid_at || payment.created_at;
  const venueCharges: Array<{ amount: number }> = pod?.place_charges ?? [];
  const venueTotal = venueCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);

  const downloadTicket = async () => {
    if (!pod?.id) return;
    setInvoiceError(null);
    try {
      const { data: tData } = await loadTicketForPod({ variables: { podId: pod.id } });
      const ticket = tData?.myEventTicketForPod;
      if (!ticket?.id) throw new Error('Ticket not ready yet — check your email shortly.');
      const { data } = await loadTicketPdf({ variables: { id: ticket.id } });
      const b64 = data?.eventTicketPdfBase64;
      if (!b64) throw new Error('Ticket not available');
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${b64}`;
      link.download = `ticket-${ticket.ticket_code}.pdf`;
      link.click();
    } catch (error) {
      setInvoiceError(parseApiError(error));
    }
  };

  const downloadInvoice = async () => {
    if (!payment.invoice_no) return;
    setInvoiceError(null);
    try {
      const { data } = await loadInvoice({ variables: { id: payment.id } });
      const b64 = data?.paymentInvoicePdfBase64;
      if (!b64) throw new Error('Invoice not available');
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${b64}`;
      link.download = `invoice-${String(payment.invoice_no).replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`;
      link.click();
    } catch (error) {
      setInvoiceError(parseApiError(error));
    }
  };

  const openGoogleCalendar = () => {
    const start = pod?.pod_date_time ? new Date(pod.pod_date_time) : new Date();
    const end = pod?.pod_end_date_time ? new Date(pod.pod_end_date_time) : new Date(start.getTime() + 60 * 60 * 1000);
    const dates = `${start.toISOString().replace(/[-:]/g, '').replace('.000', '')}/${end.toISOString().replace(/[-:]/g, '').replace('.000', '')}`;
    const params = new URLSearchParams({ action: 'TEMPLATE', text: pod?.pod_title || 'Duncit Pod', dates, details: 'Your Duncit booking is confirmed.' });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const requestAppleWallet = () => {
    notify('Apple Wallet pass is not available yet. Invoice download is separate below.', 'info');
  };

  return (
    <Box sx={{ maxWidth: 540, mx: 'auto', minHeight: '100%', display: 'grid', alignItems: 'center', p: 1 }}>
      <ConfettiOverlay open={confetti} onClose={() => setConfetti(false)} />
      <Card sx={{ borderRadius: 5, color: 'text.primary', background: isDark ? 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.18)} 55%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`, boxShadow: isDark ? '0 24px 60px rgba(17,24,39,0.28)' : `0 24px 60px ${alpha(theme.palette.primary.dark, 0.12)}` }}>
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          <PaymentLottie variant="success" size={140} />
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>You are in</Typography>
          <Typography variant="h4" fontWeight={900} gutterBottom sx={{ mt: 0.5, lineHeight: 1.05 }}>Payment Successful</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your slot is booked. A receipt with the tax invoice has been emailed to you.
          </Typography>
          <Box sx={{ mt: 3, p: 2, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.09)' : alpha(theme.palette.background.paper, 0.74), textAlign: 'left', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
          <Stack spacing={0.8}>
            <Row label="Amount paid" value={formatMoney(payment.currency_symbol, payment.total)} bold />
            {paidAt && <Row label="Paid on" value={formatDateTime(paidAt)} />}
            <Row label="Payment ID" value={payment.payment_id} mono />
            {payment.invoice_no && <Row label="Invoice" value={payment.invoice_no} mono />}
          </Stack>
          </Box>
          {pod && (
            <Box sx={{ mt: 2, p: 2, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.07)' : alpha(theme.palette.primary.light, 0.14), textAlign: 'left', border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventAvailableIcon color="primary" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={900} noWrap>{pod.pod_title}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDateTime(pod.pod_date_time)}</Typography>
                  </Box>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button fullWidth variant="contained" startIcon={<AppleIcon />} onClick={requestAppleWallet} sx={{ bgcolor: '#050505', color: '#fff', borderRadius: 3, '&:hover': { bgcolor: '#171717' } }}>
                    Add to Apple Wallet
                  </Button>
                  <Button fullWidth variant="contained" startIcon={<GoogleIcon />} onClick={openGoogleCalendar} sx={{ bgcolor: '#1f2937', color: '#fff', borderRadius: 3, '&:hover': { bgcolor: '#111827' } }}>
                    Add to Google Wallet
                  </Button>
                </Stack>
                {venueTotal > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StorefrontIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Venue charges {formatMoney(payment.currency_symbol, venueTotal)} are payable directly at the venue.
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          )}
          {invoiceError && <Alert severity="error" sx={{ mt: 2 }}>{invoiceError}</Alert>}
          <Stack direction="row" spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
            {pod?.id && (
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadTicket} disabled={ticketLoading} sx={{ borderRadius: 999, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}>Ticket</Button>
            )}
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadInvoice} disabled={!payment.invoice_no || invoiceLoading} sx={{ borderRadius: 999 }}>Invoice</Button>
            <Button variant="outlined" onClick={onHome} sx={{ borderRadius: 999 }}>Home</Button>
            <Button variant="contained" onClick={onProfile} sx={{ borderRadius: 999, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}>{profileLabel}</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function Row({ label, value, bold, mono }: Readonly<{ label: string; value: string; bold?: boolean; mono?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500} sx={mono ? { fontFamily: 'monospace' } : undefined}>{value}</Typography>
    </Stack>
  );
}
