import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { Loader, SectionCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSettings } from '../../../app/providers/LiteSettingsProvider';
import { CopyField } from '../../../components/CopyField';
import { LITE_UPI_QR, type LiteTicket } from '../../../graphql/registrations';
import { PaymentReferenceForm } from './payment-reference.form';

interface PaymentPanelProps {
  ticket: LiteTicket;
  onChanged: () => void;
}

/** Pay the host over UPI, then tell them which transaction was yours. */
export function PaymentPanel({ ticket, onChanged }: Readonly<PaymentPanelProps>) {
  const { t } = useWebT();
  const { upi_help_text: helpText } = useLiteSettings();
  const upiId = ticket.event.upi_id ?? '';
  const payee = ticket.event.upi_name ?? '';
  const { data, loading } = useQuery(LITE_UPI_QR, {
    variables: { upi_id: upiId, name: payee || null, amount: ticket.amount_due, note: ticket.event.title },
    skip: !upiId,
  });
  const qr = data?.liteUpiQr;
  const amount = formatMoney(ticket.amount_due);
  const waiting = ticket.payment_reference && ticket.payment_status === 'PENDING';

  return (
    <SectionCard title={t('liteWeb.payment.title', { vars: { amount } })} subtitle={t('liteWeb.payment.subtitle')}>
      <Stack spacing={2} data-testid="payment-panel">
        {ticket.payment_status === 'REJECTED' ? <Alert severity="error">{t('liteWeb.payment.rejected')}</Alert> : null}
        {helpText ? <Alert severity="info">{helpText}</Alert> : null}
        {upiId ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
            <Box sx={{ width: 200, flexShrink: 0, alignSelf: { xs: 'center', sm: 'flex-start' } }}>
              {loading ? <Loader label={t('lite.common.loading')} /> : null}
              {qr ? <Box component="img" src={qr.data_url} alt={t('liteWeb.payment.qrAlt', { vars: { upi: upiId } })} width={200} height={200} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }} data-testid="upi-qr" /> : null}
            </Box>
            <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.4rem' }} data-testid="payment-amount">
                {amount}
              </Typography>
              {payee ? <Typography color="text.secondary">{t('liteWeb.payment.payee', { vars: { name: payee } })}</Typography> : null}
              <CopyField label={t('liteWeb.payment.upiId')} value={upiId} testId="payment-upi-id" />
              {qr ? (
                <DuncitButton
                  component="a"
                  href={qr.upi_link}
                  variant="outlined"
                  endIcon={<OpenInNewIcon />}
                  sx={{ display: { xs: 'inline-flex', md: 'none' }, alignSelf: 'flex-start' }}
                  data-testid="payment-open-app"
                >
                  {t('liteWeb.payment.openApp')}
                </DuncitButton>
              ) : null}
            </Stack>
          </Stack>
        ) : (
          <Alert severity="warning">{t('liteWeb.payment.noUpi')}</Alert>
        )}
        {waiting ? <Alert severity="success" data-testid="payment-waiting">{t('liteWeb.payment.waiting', { vars: { reference: ticket.payment_reference ?? '' } })}</Alert> : null}
        <Typography variant="subtitle2">{waiting ? t('liteWeb.payment.updateReference') : t('liteWeb.payment.afterPaying')}</Typography>
        <PaymentReferenceForm
          registrationId={ticket.id}
          initialReference={ticket.payment_reference ?? ''}
          initialNote={ticket.payment_note ?? ''}
          onSent={onChanged}
        />
      </Stack>
    </SectionCard>
  );
}
