import { useNavigate } from 'react-router';
import { Box, Card, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { DuncitButton } from '@duncit/buttons';
import { formatMoney } from '@duncit/utils';
import TwoToneHeading from '../../components/TwoToneHeading';
import { useTranslation } from '../../i18n/useTranslation';
import type { CheckoutPaymentRow } from '../checkout-page/queries';

interface GiftCardSuccessCardProps {
  payment: CheckoutPaymentRow;
  gift: boolean;
  recipientEmail: string;
}

/** The success mark: a green check on the tonal green disc. */
const CHECK_DISC_SX = {
  width: 80,
  height: 80,
  mx: 'auto',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: 'primary.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
  '& svg': { fontSize: 44 },
} as const;

/** Purchase confirmation — the card and its code have gone out by email; the
 * gift body says to whose inbox. */
export default function GiftCardSuccessCard({ payment, gift, recipientEmail }: Readonly<GiftCardSuccessCardProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const body = gift
    ? t('mweb.giftCards.successGiftBody', { vars: { email: recipientEmail } })
    : t('mweb.giftCards.successSelfBody');

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 540, mx: 'auto', py: 3, textAlign: 'center' }}>
      <Box sx={CHECK_DISC_SX}>
        <CheckRoundedIcon />
      </Box>
      <Stack spacing={1}>
        <TwoToneHeading lead={t('mweb.giftCards.successTitle')} align="center" />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {body}
        </Typography>
      </Stack>
      <Card sx={{ p: 2, textAlign: 'left' }}>
        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('mweb.checkout.amountPaid')}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>
              {formatMoney(payment.total, { symbol: payment.currency_symbol })}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('mweb.checkout.paymentId')}
            </Typography>
            <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace', minWidth: 0 }}>
              {payment.payment_id}
            </Typography>
          </Stack>
        </Stack>
      </Card>
      <Stack spacing={1.25}>
        <DuncitButton
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate('/gift-cards?selectedtab=mycards', { replace: true })}
        >
          {t('mweb.giftCards.viewMyCards')}
        </DuncitButton>
        <DuncitButton variant="outlined" size="large" fullWidth onClick={() => navigate('/')}>
          {t('mweb.checkout.home')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
