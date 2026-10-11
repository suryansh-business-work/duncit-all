import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { DELETE_MY_BRAND, type EcommBrand } from './queries';
import { DeletionRequestDialog, DeletionStateChip, useDeletionRequests } from './deletion-request';

interface Props {
  brand: Pick<EcommBrand, 'id' | 'brand_name' | 'status'>;
  /** The button's own words — the wizard says "Delete brand", the Orders page names the action for one brand. */
  label: string;
  size?: 'small' | 'medium';
  /** A deletion request was raised (the brand stays until it runs). */
  onRequested?: () => void;
  /** The brand is gone: it was still in setup, so it was deleted outright. */
  onDeleted: () => void;
}

/**
 * Delete a brand — one rule wherever it is offered. A LIVE (approved) brand is
 * a deletion request the Products team reviews, with the choice to wait for
 * running orders or cancel them and refund the buyers; a brand still in setup
 * is deleted outright after a confirmation. While a request is open, its state
 * is shown instead of the button.
 */
export default function BrandDeleteButton({ brand, label, size = 'medium', onRequested, onDeleted }: Readonly<Props>) {
  const { t } = useTranslation();
  const [deleteBrand, deleteState] = useMutation(DELETE_MY_BRAND);
  const [open, setOpen] = useState<'confirm' | 'request' | null>(null);
  const { openFor, reload } = useDeletionRequests(brand.id);
  const openRequest = openFor('BRAND', brand.id);
  const brandName = brand.brand_name || t('partners.ecommBrandPage.untitledBrand');

  const confirmDelete = async () => {
    try {
      await deleteBrand({ variables: { brand_doc_id: brand.id } });
      notifySuccess(t('partners.brandWizard.danger.deleted'));
      setOpen(null);
      onDeleted();
    } catch (error) {
      notifyError(parseApiError(error));
      setOpen(null);
    }
  };

  if (openRequest) {
    return (
      <Stack direction="row" sx={{ alignSelf: 'flex-start' }}>
        <DeletionStateChip request={openRequest} />
      </Stack>
    );
  }
  return (
    <>
      <DuncitButton
        variant="outlined"
        color="error"
        size={size}
        startIcon={<DeleteForeverIcon />}
        onClick={() => setOpen(brand.status === 'APPROVED' ? 'request' : 'confirm')}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="brand-danger-delete"
      >
        {label}
      </DuncitButton>
      <ConfirmDialog
        open={open === 'confirm'}
        title={t('partners.brandWizard.danger.deleteConfirmTitle', { vars: { brand: brandName } })}
        message={t('partners.brandWizard.danger.deleteConfirmBody')}
        destructive
        busy={deleteState.loading}
        busyLabel={t('shell.common.deleting')}
        confirmLabel={t('shell.common.delete')}
        onConfirm={confirmDelete}
        onClose={() => setOpen(null)}
      />
      <DeletionRequestDialog
        target={open === 'request' ? { kind: 'BRAND', id: brand.id, name: brandName } : null}
        onClose={() => setOpen(null)}
        onDone={() => {
          reload();
          onRequested?.();
        }}
      />
    </>
  );
}
