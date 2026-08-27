import { Box, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
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
  const { t } = useTranslation();
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorefrontIcon color="primary" fontSize="small" />
        {t('mweb.checkout.venueCharges')}
        <DuncitIconButton onClick={onClose} aria-label={t('mweb.checkout.close')} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.checkout.venueChargesIntro')}
          </Typography>
          {charges.length > 0 && (
            <Stack
              spacing={1}
              sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'action.hover' }}
              divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}
            >
              {charges.map((charge) => (
                <Stack
                  key={`${charge.label}|${charge.amount}|${charge.note ?? ''}`}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "flex-start",
                    justifyContent: "space-between"
                  }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{
                      fontWeight: 600
                    }}>
                      {charge.label}
                    </Typography>
                    {charge.note && (
                      <Typography variant="caption" sx={{
                        color: "text.secondary"
                      }}>
                        {charge.note}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{
                    fontWeight: 700
                  }}>
                    {formatMoney(currency, charge.amount)}
                  </Typography>
                </Stack>
              ))}
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                <Typography variant="body2" sx={{
                  fontWeight: 700
                }}>
                  {t('mweb.checkout.venueChargesTotal')}
                </Typography>
                <Typography variant="body2" sx={{
                  fontWeight: 700
                }}>
                  {formatMoney(currency, total)}
                </Typography>
              </Stack>
            </Stack>
          )}
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.checkout.venueChargesNote')}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
