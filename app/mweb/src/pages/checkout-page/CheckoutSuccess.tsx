import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { useTranslation } from '../../i18n/useTranslation';
import { useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { alpha } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import PaymentLottie from '../../components/PaymentLottie';
import ConfettiOverlay from '../../components/ConfettiOverlay';
import TwoToneHeading from '../../components/TwoToneHeading';
import { SuccessPodCard, SuccessReceiptCard } from './SuccessDetails';
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

/** The confirmation after a paid checkout: a calm success mark, the receipt,
 * the booked pod, and what to do next. Native twin: checkout/CheckoutSuccess. */
export default function CheckoutSuccess({ payment, pod, onHome, onProfile, profileLabel }: Readonly<Props>) {
  const [confetti, setConfetti] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [loadInvoice, { loading: invoiceLoading }] = useLazyQuery<any>(INVOICE_PDF, { fetchPolicy: 'network-only' });
  const [loadTicketForPod] = useLazyQuery<any>(MY_TICKET_FOR_POD, { fetchPolicy: 'network-only' });
  const [loadTicketPdf, { loading: ticketLoading }] = useLazyQuery<any>(TICKET_PDF, { fetchPolicy: 'network-only' });
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const profileAction = profileLabel ?? t('mweb.checkout.myProfile');
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

  const venueNote = venueTotal > 0
    ? t('mweb.checkout.venueChargesPaid', { vars: { amount: formatMoney(payment.currency_symbol, venueTotal) } })
    : null;

  return (
    <Box
      sx={{ maxWidth: 540, mx: 'auto', minHeight: '100%', display: 'grid', alignItems: 'center', py: 2 }}
      data-testid="checkout-success"
    >
      <ConfettiOverlay open={confetti} onClose={() => setConfetti(false)} />
      <Stack spacing={2} sx={{ textAlign: 'center' }}>
        <Box
          sx={(theme) => ({
            width: 96,
            height: 96,
            mx: 'auto',
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            display: 'grid',
            placeItems: 'center',
          })}
        >
          <PaymentLottie variant="success" size={64} />
        </Box>
        <TwoToneHeading
          lead={t('mweb.checkout.successTitle')}
          trail={t('mweb.checkout.successOverline')}
          stacked
          align="center"
        />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.checkout.successSubtitle')}
        </Typography>
        <SuccessReceiptCard payment={payment} />
        {pod && (
          <SuccessPodCard
            title={pod.pod_title}
            when={formatDateTime(pod.pod_date_time)}
            venueNote={venueNote}
            onAppleWallet={requestAppleWallet}
            onGoogleCalendar={openGoogleCalendar}
          />
        )}
        {invoiceError && <Alert severity="error" data-testid="invoice-error">{invoiceError}</Alert>}
        <Stack spacing={1.25}>
          {pod?.id && (
            <DuncitButton
              fullWidth
              size="large"
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={downloadTicket}
              disabled={ticketLoading}
              data-testid="download-ticket"
            >
              {t('mweb.ticket.download')}
            </DuncitButton>
          )}
          <DuncitButton
            fullWidth
            size="large"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadInvoice}
            disabled={!payment.invoice_no || invoiceLoading}
            data-testid="download-invoice"
          >
            {t('mweb.checkout.downloadInvoice')}
          </DuncitButton>
          <Stack direction="row" spacing={1.25}>
            <DuncitButton
              fullWidth
              variant="outlined"
              onClick={onHome}
              sx={{ minHeight: 48 }}
              data-testid="success-home"
            >
              {t('mweb.checkout.home')}
            </DuncitButton>
            <DuncitButton
              fullWidth
              variant="contained"
              onClick={onProfile}
              sx={{ minHeight: 48 }}
              data-testid="success-profile"
            >
              {profileAction}
            </DuncitButton>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
