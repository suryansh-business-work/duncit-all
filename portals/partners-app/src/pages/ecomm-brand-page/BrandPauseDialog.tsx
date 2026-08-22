import { useMutation } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { SET_MY_BRAND_ACTIVE, type EcommBrandRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  target: EcommBrandRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Confirm + run the temporary deactivate/reactivate of an own brand. While
 * paused the brand and every one of its products are hidden from the shop;
 * placed orders are unaffected. Reports the outcome through onDone. */
export default function BrandPauseDialog({ target, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [setBrandActive, activeState] = useMutation(SET_MY_BRAND_ACTIVE);
  const activating = target ? target.is_active === false : false;
  const body = activating
    ? 'and its products will be visible in the shop again.'
    : 'and all of its products will be hidden from the shop until you reactivate it. Orders already placed are not affected.';

  const confirm = async () => {
    if (!target) return;
    try {
      await setBrandActive({ variables: { brand_doc_id: target.id, active: activating } });
      onDone('Brand visibility updated.');
    } catch (toggleError) {
      onDone(parseApiError(toggleError));
    }
    onClose();
  };

  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{activating ? 'Reactivate brand' : 'Temporarily deactivate brand'}</DialogTitle>
      <DialogContent>
        <Typography>
          {target?.brand_name || 'This brand'} {body}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.cancel')}</Button>
        <Button
          color={activating ? 'success' : 'warning'}
          variant="contained"
          disabled={activeState.loading}
          onClick={confirm}
        >
          {activating ? 'Reactivate' : 'Deactivate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
