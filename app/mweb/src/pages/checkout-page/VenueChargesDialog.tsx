import { Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { formatMoney } from './checkoutMath';

export interface VenueCharge {
  label: string;
  amount: number;
  note?: string | null;
}

interface Props {
  open: boolean;
  charges: VenueCharge[];
  currency: string;
  onClose: () => void;
}

/** Read-only info dialog for the venue-side charges shown on the checkout
 * summary. These are paid directly at the venue and are NOT part of the online
 * payable amount, so this purely explains + itemises them. */
export default function VenueChargesDialog({ open, charges, currency, onClose }: Readonly<Props>) {
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorefrontIcon color="primary" fontSize="small" />
        Venue Charges
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Optional venue-side charges to be paid to the Venue.
          </Typography>
          {charges.length > 0 && (
            <Stack
              spacing={1}
              sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
              divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}
            >
              {charges.map((charge) => (
                <Stack
                  key={`${charge.label}|${charge.amount}|${charge.note ?? ''}`}
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {charge.label}
                    </Typography>
                    {charge.note && (
                      <Typography variant="caption" color="text.secondary">
                        {charge.note}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={700}>
                    {formatMoney(currency, charge.amount)}
                  </Typography>
                </Stack>
              ))}
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={900}>
                  Total venue charges
                </Typography>
                <Typography variant="body2" fontWeight={900}>
                  {formatMoney(currency, total)}
                </Typography>
              </Stack>
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary">
            Pay this directly at the venue — it is not included in your online payment.
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
