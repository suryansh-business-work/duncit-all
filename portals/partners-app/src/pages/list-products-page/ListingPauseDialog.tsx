import { useMutation } from '@apollo/client';
import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { SET_LISTING_ACTIVE, type ProductListingRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  target: ProductListingRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Confirm + run the temporary deactivate/reactivate of an own listing. While
 * paused the product is hidden from the shop everywhere; placed orders are
 * unaffected. Reports the outcome (success or API error) through onDone. */
export default function ListingPauseDialog({ target, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [setListingActive, activeState] = useMutation(SET_LISTING_ACTIVE);
  const activating = target ? target.is_active === false : false;
  const body = activating
    ? 'will be visible and purchasable in the shop again.'
    : 'will be hidden from the shop until you reactivate it. Orders already placed are not affected.';

  const confirm = async () => {
    if (!target) return;
    try {
      await setListingActive({ variables: { product_doc_id: target.id, active: activating } });
      onDone('Product visibility updated.');
    } catch (toggleError) {
      onDone(parseApiError(toggleError));
    }
    onClose();
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{activating ? 'Reactivate product' : 'Temporarily deactivate product'}</DialogTitle>
      <DialogContent>
        <Typography>
          {target?.product_name} {body}
        </Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          color={activating ? 'success' : 'warning'}
          variant="contained"
          disabled={activeState.loading}
          onClick={confirm}
        >
          {activating ? 'Reactivate' : 'Deactivate'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
