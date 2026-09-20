import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, DialogContentText, Divider, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { ADMIN_DELETE_ECOMM_BRAND, SET_ECOMM_BRAND_ACTIVE, type EcommBrandRow } from '../queries';

interface Props {
  brand: EcommBrandRow;
  /** Re-reads the brand after a reversible change. */
  onChanged: () => Promise<void>;
}

/** Deactivate/reactivate (reversible) and delete (not). Both confirm first;
 * the delete also demands a reason, because the partner is emailed it. */
export default function BrandStatusPanel({ brand, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [setActive, { loading: toggling }] = useMutation<any>(SET_ECOMM_BRAND_ACTIVE);
  const [remove, { loading: deleting }] = useMutation<any>(ADMIN_DELETE_ECOMM_BRAND);
  const [confirmActive, setConfirmActive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesMissing, setNotesMissing] = useState(false);

  const active = brand.is_active === true;
  const toggleLabel = active ? t('products.brandReview.deactivate') : t('products.brandReview.reactivate');
  const toggleTitle = active ? t('products.brandReview.deactivateTitle') : t('products.brandReview.reactivate');
  const toggleBody = active ? t('products.brandReview.deactivateBody') : t('products.brandReview.reactivateBody');

  const toggle = async () => {
    try {
      await setActive({ variables: { brand_doc_id: brand.id, active: !active } });
      notifySuccess(active ? t('products.brandReview.deactivated') : t('products.brandReview.reactivated'));
      setConfirmActive(false);
      await onChanged();
    } catch (e) {
      notifyError(parseApiError(e));
    }
  };

  const destroy = async () => {
    const reason = notes.trim();
    if (!reason) {
      setNotesMissing(true);
      return;
    }
    try {
      await remove({ variables: { brand_doc_id: brand.id, notes: reason } });
      notifySuccess(t('products.brandReview.deleted'));
      navigate('/ecomm/brands');
    } catch (e) {
      notifyError(parseApiError(e));
    }
  };

  const openDelete = () => {
    setNotes('');
    setNotesMissing(false);
    setConfirmDelete(true);
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Box>
            <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('products.brandReview.deactivateTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('products.brandReview.deactivateBody')}
            </Typography>
          </Box>
          <DuncitButton
            variant="outlined"
            color={active ? 'warning' : 'success'}
            onClick={() => setConfirmActive(true)}
            data-testid="brand-toggle-active"
          >
            {toggleLabel}
          </DuncitButton>
        </Stack>
        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Box>
            <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('products.brandReview.deleteTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('products.brandReview.deleteBody')}
            </Typography>
          </Box>
          <DuncitButton variant="outlined" color="error" onClick={openDelete} data-testid="brand-delete">
            {t('products.brandReview.delete')}
          </DuncitButton>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmActive}
        title={toggleTitle}
        message={toggleBody}
        confirmLabel={toggleLabel}
        confirmColor={active ? 'warning' : 'success'}
        loading={toggling}
        onClose={() => setConfirmActive(false)}
        onConfirm={toggle}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t('products.brandReview.deleteConfirmTitle', { vars: { brand: brand.brand_name } })}
        message={
          <Stack spacing={2}>
            <DialogContentText>{t('products.brandReview.deleteConfirmBody')}</DialogContentText>
            <TextField
              label={t('products.brandReview.deleteNotes')}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setNotesMissing(false);
              }}
              required
              multiline
              minRows={2}
              error={notesMissing}
              helperText={notesMissing ? t('products.brandReview.deleteNotesRequired') : ' '}
              data-testid="brand-delete-notes"
            />
          </Stack>
        }
        confirmLabel={t('products.brandReview.delete')}
        destructive
        loading={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={destroy}
      />
    </>
  );
}
