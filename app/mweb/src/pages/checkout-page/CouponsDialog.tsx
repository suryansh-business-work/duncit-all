import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import type { AvailableCoupon } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
import { formatMoney } from './checkoutMath';

interface Props {
  open: boolean;
  coupons: AvailableCoupon[];
  currency: string;
  onClose: () => void;
  onPick: (code: string) => void;
}

/** Available-coupons picker for checkout — lists the active global + pod
 * coupons from the admin panel; tapping one applies it (B2-#3). */
export default function CouponsDialog({ open, coupons, currency, onClose, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        {t('mweb.checkout.couponsTitle')}
        <IconButton onClick={onClose} aria-label={t('mweb.checkout.close')} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {coupons.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              py: 3,
              textAlign: 'center'
            }}>
            {t('mweb.checkout.couponsEmpty')}
          </Typography>
        ) : (
          <Stack spacing={1.25} sx={{ pb: 1 }}>
            {coupons.map((coupon) => (
              <Box
                key={coupon.id}
                role="button"
                tabIndex={0}
                onClick={() => onPick(coupon.code)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onPick(coupon.code);
                }}
                sx={{
                  p: 1.5,
                  borderRadius: '16px',
                  border: '1px dashed',
                  borderColor: 'primary.main',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <LocalOfferIcon color="primary" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} sx={{
                    alignItems: "center"
                  }}>
                    <Typography variant="subtitle2" sx={{
                      fontWeight: 700
                    }}>
                      {coupon.code}
                    </Typography>
                    <Chip
                      size="small"
                      color="success"
                      label={t('mweb.checkout.couponPercentOff', { vars: { pct: coupon.discount_pct } })}
                      sx={{ height: 20, fontWeight: 600 }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
                    {coupon.description ||
                      (coupon.scope === 'POD'
                        ? t('mweb.checkout.couponForPod')
                        : t('mweb.checkout.couponAllPods'))}
                    {coupon.min_order_amount > 0
                      ? ` · ${t('mweb.checkout.couponMin', { vars: { amount: formatMoney(currency, coupon.min_order_amount) } })}`
                      : ''}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
