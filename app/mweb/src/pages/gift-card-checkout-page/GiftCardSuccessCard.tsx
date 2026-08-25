import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import PaymentLottie from '../../components/PaymentLottie';
import { useTranslation } from '../../i18n/useTranslation';
import type { CheckoutPaymentRow } from '../checkout-page/queries';

interface GiftCardSuccessCardProps {
  payment: CheckoutPaymentRow;
  gift: boolean;
  recipientEmail: string;
}

/** Purchase confirmation — the card and its code have gone out by email; the
 * gift body says to whose inbox. */
export default function GiftCardSuccessCard({ payment, gift, recipientEmail }: Readonly<GiftCardSuccessCardProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const body = gift
    ? t('mweb.giftCards.successGiftBody', { vars: { email: recipientEmail } })
    : t('mweb.giftCards.successSelfBody');

  return (
    <Box sx={{ maxWidth: 540, mx: 'auto', minHeight: '100%', display: 'grid', alignItems: 'center', p: 1 }}>
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          <PaymentLottie variant="success" size={140} />
          <Typography variant="h5" gutterBottom sx={{
            fontWeight: 700
          }}>
            {t('mweb.giftCards.successTitle')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {body}
          </Typography>
          <Box sx={{ mt: 2.5, p: 2, borderRadius: '16px', bgcolor: 'action.hover', textAlign: 'left' }}>
            <Stack spacing={0.8}>
              <Stack direction="row" sx={{
                justifyContent: "space-between"
              }}>
                <Typography variant="subtitle2" sx={{
                  fontWeight: 700
                }}>
                  {t('mweb.checkout.amountPaid')}
                </Typography>
                <Typography variant="subtitle2" sx={{
                  fontWeight: 700
                }}>
                  {formatMoney(payment.total, { symbol: payment.currency_symbol })}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{
                justifyContent: "space-between"
              }}>
                <Typography variant="body2">{t('mweb.checkout.paymentId')}</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {payment.payment_id}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ mt: 3, justifyContent: 'center' }}>
            <Button variant="outlined" onClick={() => navigate('/')} sx={{ borderRadius: 999 }}>
              {t('mweb.checkout.home')}
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/gift-cards?selectedtab=mycards', { replace: true })}
              sx={{ borderRadius: 999, fontWeight: 700 }}
            >
              {t('mweb.giftCards.viewMyCards')}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
