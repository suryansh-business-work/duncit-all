import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import BrandPauseDialog from '../BrandPauseDialog';
import { DELETE_MY_BRAND, type EcommBrand } from '../queries';

interface Props {
  brand: EcommBrand;
  onChanged: () => void;
}

/** Bottom of the wizard: pause/reactivate an approved brand, or delete the brand outright. */
export default function BrandDangerZone({ brand, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleteBrand, deleteState] = useMutation<any>(DELETE_MY_BRAND);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const paused = brand.is_active === false;

  const confirmDelete = async () => {
    try {
      await deleteBrand({ variables: { brand_doc_id: brand.id } });
      notifySuccess(t('partners.brandWizard.danger.deleted'));
      navigate('/ecomm-brand', { replace: true });
    } catch (error) {
      notifyError(parseApiError(error));
      setDeleteOpen(false);
    }
  };

  return (
    <SectionCard title={t('partners.brandWizard.danger.title')}>
      <Stack spacing={2.5}>
        {brand.status === 'APPROVED' && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
              {t('partners.brandWizard.danger.deactivateTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('partners.brandWizard.danger.deactivateBody')}
            </Typography>
            <DuncitButton
              variant="outlined"
              color={paused ? 'success' : 'warning'}
              startIcon={paused ? <PlayCircleOutlineIcon /> : <PauseCircleOutlineIcon />}
              onClick={() => setPauseOpen(true)}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="brand-danger-pause"
            >
              {paused ? t('partners.brandWizard.danger.reactivate') : t('partners.brandWizard.danger.deactivate')}
            </DuncitButton>
          </Stack>
        )}
        <Stack spacing={1}>
          <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
            {t('partners.brandWizard.danger.deleteTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('partners.brandWizard.danger.deleteBody')}
          </Typography>
          <DuncitButton
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setDeleteOpen(true)}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="brand-danger-delete"
          >
            {t('partners.brandWizard.danger.delete')}
          </DuncitButton>
        </Stack>
      </Stack>
      <BrandPauseDialog
        target={pauseOpen ? brand : null}
        onClose={() => setPauseOpen(false)}
        onDone={(text) => {
          notifySuccess(text);
          onChanged();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={t('partners.brandWizard.danger.deleteConfirmTitle', { vars: { brand: brand.brand_name || t('partners.ecommBrandPage.untitledBrand') } })}
        message={t('partners.brandWizard.danger.deleteConfirmBody')}
        destructive
        busy={deleteState.loading}
        busyLabel={t('shell.common.deleting')}
        confirmLabel={t('shell.common.delete')}
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </SectionCard>
  );
}
