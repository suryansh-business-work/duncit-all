import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ProductListingRow } from '../queries';

interface Props {
  target: ProductListingRow | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

/** Confirms archiving a listing before it leaves the active catalogue. */
export function DeleteListingDialog({ target, deleting, onCancel, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={Boolean(target)} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{t('partners.listProductsPage.deleteProductListing')}</DialogTitle>
      <DialogContent>
        <Typography>{t('partners.listProductsPage.deleteListingBody', { vars: { name: target?.product_name ?? '' } })}</Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton color="error" variant="contained" disabled={deleting} onClick={onConfirm}>{t('shell.common.delete')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
