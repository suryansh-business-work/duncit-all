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
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6, fontWeight: 900 }}>
        Available coupons
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {coupons.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No coupons available right now.
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
                  borderRadius: 2,
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
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={900}>
                      {coupon.code}
                    </Typography>
                    <Chip size="small" color="success" label={`${coupon.discount_pct}% off`} sx={{ height: 20, fontWeight: 800 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {coupon.description || (coupon.scope === 'POD' ? 'For this pod' : 'All pods')}
                    {coupon.min_order_amount > 0
                      ? ` · Min ${formatMoney(currency, coupon.min_order_amount)}`
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
