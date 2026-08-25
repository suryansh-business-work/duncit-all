import { gql, useLazyQuery } from '@apollo/client';
import { useTranslation } from '../../i18n/useTranslation';
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
   * checkout routes to "My orders"). */
  profileLabel?: string;
}

export default function CheckoutSuccess({ payment, pod, onHome, onProfile, profileLabel }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [confetti, setConfetti] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [loadInvoice, { loading: invoiceLoading }] = useLazyQuery(INVOICE_PDF, { fetchPolicy: 'network-only' });
  const [loadTicketForPod] = useLazyQuery(MY_TICKET_FOR_POD, { fetchPolicy: 'network-only' });
  const [loadTicketPdf, { loading: ticketLoading }] = useLazyQuery(TICKET_PDF, { fetchPolicy: 'network-only' });
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const profileAction = profileLabel ?? t('mweb.checkout.myProfile');
  const paidAt = payment.paid_at || payment.created_at;
  const venueCharges: Array<{ amount: number }> = pod?.place_charges ?? [];
  const venueTotal = venueCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);

  const downloadTicket = async () => {
    if (!pod?.id) return;
    setInvoiceError(null);
    try {
      const { data: tData } = await loadTicketForPod({ variables: { podId: pod.id } });
      const ticket = tData?.myEventTicketForPod;
      if (!ticket?.id) throw new Error(t('mweb.checkout.errorTicketNotReady'));
      const { data } = await loadTicketPdf({ variables: { id: ticket.id } });
      const b64 = data?.eventTicketPdfBase64;
      if (!b64) throw new Error(t('mweb.checkout.errorTicketUnavailable'));
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${b64}`;
      link.download = `ticket-and-invoice-${ticket.ticket_code}.pdf`;
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
      if (!b64) throw new Error(t('mweb.checkout.errorInvoiceUnavailable'));
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
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: pod?.pod_title || t('mweb.checkout.calendarEventFallback'),
      dates,
      details: t('mweb.checkout.calendarDetails'),
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const requestAppleWallet = () => {
    notify(t('mweb.checkout.appleWalletUnavailable'), 'info');
  };

  return (
    <Box sx={{ maxWidth: 540, mx: 'auto', minHeight: '100%', display: 'grid', alignItems: 'center', p: 1 }}>
      <ConfettiOverlay open={confetti} onClose={() => setConfetti(false)} />
      <Card sx={{ borderRadius: '16px', color: 'text.primary', background: isDark ? 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.18)} 55%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`, boxShadow: isDark ? '0 24px 60px rgba(17,24,39,0.28)' : `0 24px 60px ${alpha(theme.palette.primary.dark, 0.12)}` }}>
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          <PaymentLottie variant="success" size={140} />
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>{t('mweb.checkout.successOverline')}</Typography>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              mt: 0.5,
              lineHeight: 1.05
            }}>{t('mweb.checkout.successTitle')}</Typography>
          <Typography variant="body2" gutterBottom sx={{
            color: "text.secondary"
          }}>
            {t('mweb.checkout.successSubtitle')}
          </Typography>
          <Box sx={{ mt: 3, p: 2, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.09)' : alpha(theme.palette.background.paper, 0.74), textAlign: 'left', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
          <Stack spacing={0.8}>
            <Row label={t('mweb.checkout.amountPaid')} value={formatMoney(payment.currency_symbol, payment.total)} bold />
            {paidAt && <Row label={t('mweb.checkout.paidOn')} value={formatDateTime(paidAt)} />}
            <Row label={t('mweb.checkout.paymentId')} value={payment.payment_id} mono />
            {payment.invoice_no && <Row label={t('mweb.checkout.invoiceLabel')} value={payment.invoice_no} mono />}
          </Stack>
          </Box>
          {pod && (
            <Box sx={{ mt: 2, p: 2, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.07)' : alpha(theme.palette.primary.light, 0.14), textAlign: 'left', border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <EventAvailableIcon color="primary" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{
                      fontWeight: 700
                    }}>{pod.pod_title}</Typography>
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>{formatDateTime(pod.pod_date_time)}</Typography>
                  </Box>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button fullWidth variant="contained" startIcon={<AppleIcon />} onClick={requestAppleWallet} sx={{ bgcolor: '#050505', color: '#fff', borderRadius: '16px', '&:hover': { bgcolor: '#171717' } }}>
                    {t('mweb.checkout.appleWallet')}
                  </Button>
                  <Button fullWidth variant="contained" startIcon={<GoogleIcon />} onClick={openGoogleCalendar} sx={{ bgcolor: '#1f2937', color: '#fff', borderRadius: '16px', '&:hover': { bgcolor: '#111827' } }}>
                    {t('mweb.checkout.googleWallet')}
                  </Button>
                </Stack>
                {venueTotal > 0 && (
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: "center"
                  }}>
                    <StorefrontIcon fontSize="small" color="action" />
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      {t('mweb.checkout.venueChargesPaid', {
                        vars: { amount: formatMoney(payment.currency_symbol, venueTotal) },
                      })}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
          )}
          {invoiceError && <Alert severity="error" sx={{ mt: 2 }}>{invoiceError}</Alert>}
          <Stack direction="row" spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
            {pod?.id && (
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadTicket} disabled={ticketLoading} sx={{ borderRadius: 999, fontWeight: 700, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}>{t('mweb.ticket.download')}</Button>
            )}
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadInvoice} disabled={!payment.invoice_no || invoiceLoading} sx={{ borderRadius: 999 }}>{t('mweb.checkout.downloadInvoice')}</Button>
            <Button variant="outlined" onClick={onHome} sx={{ borderRadius: 999 }}>{t('mweb.checkout.home')}</Button>
            <Button variant="contained" onClick={onProfile} sx={{ borderRadius: 999, fontWeight: 700, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}>{profileAction}</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function Row({ label, value, bold, mono }: Readonly<{ label: string; value: string; bold?: boolean; mono?: boolean }>) {
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: "space-between",
        alignItems: "center"
      }}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} sx={{
        fontWeight: bold ? 700 : 500
      }}>{label}</Typography>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={[{
          fontWeight: bold ? 700 : 500
        }, mono ? { fontFamily: 'monospace' } : false]}>{value}</Typography>
    </Stack>
  );
}
