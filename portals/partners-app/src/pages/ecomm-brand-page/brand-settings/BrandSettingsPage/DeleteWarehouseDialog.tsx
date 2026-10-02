import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { BrandWarehouse } from '../warehouse.queries';

interface Props {
  deleteTarget: BrandWarehouse | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirms removing a warehouse, naming it first. */
export default function DeleteWarehouseDialog({ deleteTarget, busy, onCancel, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={Boolean(deleteTarget)} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{t('partners.ecommBrandPage.deleteWarehouse')}</DialogTitle>
      <DialogContent>
        <Typography>
          {deleteTarget?.nickname} will be removed. Products still shipping from it must be moved first.
        </Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton color="error" variant="contained" disabled={busy} onClick={onConfirm}>
          {t('shell.common.delete')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
