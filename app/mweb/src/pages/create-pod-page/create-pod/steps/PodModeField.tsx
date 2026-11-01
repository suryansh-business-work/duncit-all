import { Controller } from 'react-hook-form';
import { Card, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';

/** Physical or virtual — decides whether Where & when asks for a venue or a meeting. */
export default function PodModeField({ form }: Readonly<{ form: CreatePodForm }>) {
  const { control, setValue } = form;
  const { t } = useTranslation();
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('mweb.createPod.podMode')}</Typography>
      <Controller
        control={control}
        name="pod_mode"
        render={({ field }) => (
          <ToggleButtonGroup
            exclusive
            fullWidth
            aria-label={t('mweb.createPod.podMode')}
            color="primary"
            value={field.value}
            onChange={(_e, next) => {
              if (!next) return;
              field.onChange(next);
              // The club list depends on the mode, so the old pick may not be in it.
              setValue('club_id', '', { shouldDirty: true });
              // The Free/Paid pick survives the switch: a physical pod may be
              // free too, so the mode no longer forces the type.
            }}
          >
            <ToggleButton value="PHYSICAL" sx={{ py: 1.25, fontWeight: 600 }}><DirectionsRunIcon fontSize="small" sx={{ mr: 1 }} /> {t('mweb.createPod.modePhysical')}</ToggleButton>
            <ToggleButton value="VIRTUAL" sx={{ py: 1.25, fontWeight: 600 }}><VideocamIcon fontSize="small" sx={{ mr: 1 }} /> {t('mweb.createPod.modeVirtual')}</ToggleButton>
          </ToggleButtonGroup>
        )}
      />
    </Card>
  );
}
