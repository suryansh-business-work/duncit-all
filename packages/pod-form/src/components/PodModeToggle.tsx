import type { ReactNode } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useFormContext, useWatch } from 'react-hook-form';
import { POD_MODES, type PodFormValues, type PodMode } from '../types';
import { useTranslation } from '../i18n/useTranslation';

const ICONS: Record<PodMode, ReactNode> = {
  PHYSICAL: <PlaceIcon fontSize="small" sx={{ mr: 1 }} />,
  VIRTUAL: <VideocamIcon fontSize="small" sx={{ mr: 1 }} />,
};

/**
 * Physical or virtual — the one choice that reshapes the rest of the form.
 * Basic Information draws it for an ordinary pod; the Auto Pod stepper draws
 * it at the top of its details step. A click on the already-selected mode
 * deselects nothing: there is no third state.
 */
export default function PodModeToggle() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const aria: Record<PodMode, string> = {
    PHYSICAL: t('podForm.basicSection.physicalPod'),
    VIRTUAL: t('podForm.basicSection.virtualPod'),
  };
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      color="primary"
      value={podMode}
      onChange={(_, nextMode) => {
        if (nextMode) setValue('pod_mode', nextMode);
      }}
      aria-label={t('podForm.basicSection.podMode')}
    >
      {POD_MODES.map((option) => (
        <ToggleButton key={option.value} value={option.value} aria-label={aria[option.value as PodMode]}>
          {ICONS[option.value as PodMode]} {t(option.labelKey)}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
