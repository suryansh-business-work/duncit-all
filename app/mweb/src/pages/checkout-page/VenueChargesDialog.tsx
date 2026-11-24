import { Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import VenueChargesList from './VenueChargesList';

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

  return (
    <Dialog data-testid="venue-charges-sheet" open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StorefrontIcon color="primary" fontSize="small" />
        {t('mweb.checkout.venueCharges')}
        <DuncitIconButton data-testid="venue-charges-sheet-close" onClick={onClose} aria-label={t('mweb.checkout.close')} sx={{ position: 'absolute', right: 8, top: 8 }}>
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
            <VenueChargesList
              charges={charges}
              currency={currency}
              totalLabel={t('mweb.checkout.venueChargesTotal')}
            />
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
