import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { DuncitButton } from '@duncit/buttons';
import { smartIncentiveFor } from '@duncit/utils';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import type { useSmartIncentiveOffer } from './useSmartIncentiveOffer';

interface Props {
  /** The page's offer: its percentage, and whether its popup is up. */
  incentive: ReturnType<typeof useSmartIncentiveOffer>;
  /** One ticket's full price. */
  unitPrice: number;
  /** The booking bar's paid checkout — it carries the seats already picked. */
  onBook: () => void;
}

/**
 * The Smart Incentive popup. The member stayed on the pod page without booking,
 * so the host's offer has just been unlocked for them: one ticket's price with
 * it, against the full price. Book now goes straight to checkout, which takes
 * the discount off on its own; Maybe later keeps it unlocked, and the booking
 * bar goes on showing the lower price.
 */
export default function SmartIncentiveOfferDialog({ incentive, unitPrice, onBook }: Readonly<Props>) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const pct = incentive.offer?.pct ?? 0;
  const price = smartIncentiveFor(unitPrice, pct).net;
  const book = () => {
    incentive.closeDialog();
    onBook();
  };

  return (
    <Dialog
      open={incentive.dialogOpen}
      onClose={incentive.closeDialog}
      maxWidth="xs"
      fullWidth
      aria-labelledby="smart-incentive-offer-title"
      aria-describedby="smart-incentive-offer-body"
      data-testid="smart-incentive-offer"
    >
      <DialogTitle id="smart-incentive-offer-title" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <LocalOfferOutlinedIcon color="primary" />
        {t('mweb.smartIncentive.offerTitle', { vars: { pct } })}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="smart-incentive-offer-body">
          {t('mweb.smartIncentive.offerBody', { vars: { pct } })}
        </DialogContentText>
        <Typography data-testid="smart-incentive-offer-price" sx={{ mt: 1.5, fontWeight: 600 }}>
          {t('mweb.smartIncentive.offerPrice', { vars: { price: format(price), fullPrice: format(unitPrice) } })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={incentive.closeDialog} data-testid="smart-incentive-offer-later">
          {t('mweb.smartIncentive.offerLater')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={book} data-testid="smart-incentive-offer-book">
          {t('mweb.smartIncentive.offerBook')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
