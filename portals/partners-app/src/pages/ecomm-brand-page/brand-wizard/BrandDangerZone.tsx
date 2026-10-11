import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import BrandDeleteButton from '../BrandDeleteButton';
import BrandPauseDialog from '../BrandPauseDialog';
import type { EcommBrand } from '../queries';

interface Props {
  brand: EcommBrand;
  onChanged: () => void;
}

/** Bottom of the wizard: pause/reactivate an approved brand, or delete the brand (a LIVE one by request). */
export default function BrandDangerZone({ brand, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pauseOpen, setPauseOpen] = useState(false);
  const paused = brand.is_active === false;

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
          {/* The one delete rule (request for a LIVE brand, outright otherwise) — shared with the Orders page. */}
          <BrandDeleteButton
            brand={brand}
            label={t('partners.brandWizard.danger.delete')}
            onRequested={onChanged}
            onDeleted={() => navigate('/ecomm-brand', { replace: true })}
          />
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
    </SectionCard>
  );
}
