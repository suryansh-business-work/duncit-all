import { useState } from 'react';
import { useFormState, type Control } from 'react-hook-form';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { PreviewMode } from '../preview/palette';
import PaletteFields from './PaletteFields';
import type { OccasionThemeFormValues } from './occasion-theme.types';

/**
 * The look's colour tokens, light and dark. A blank token keeps the app's own
 * colour; a mode with a mistake in it is flagged on its switch, so an error in
 * the palette not on screen is never missed.
 */
export default function ColoursSection({ control }: Readonly<{ control: Control<OccasionThemeFormValues> }>) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PreviewMode>('light');
  const { errors } = useFormState({ control, name: ['palette_light', 'palette_dark'] });
  const flag = (bad: boolean) => (bad ? <ErrorRoundedIcon fontSize="small" color="error" titleAccess={t('marketing.occasions.editor.hasErrors')} /> : null);

  return (
    <SectionCard
      title={t('marketing.occasions.editor.coloursTitle')}
      subtitle={t('marketing.occasions.editor.coloursSubtitle')}
      action={
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, next: PreviewMode | null) => next && setMode(next)}
          aria-label={t('marketing.occasions.editor.paletteMode')}
        >
          <ToggleButton value="light" sx={{ gap: 0.5 }}>
            <LightModeRoundedIcon fontSize="small" />
            {t('marketing.occasions.preview.light')}
            {flag(!!errors.palette_light)}
          </ToggleButton>
          <ToggleButton value="dark" sx={{ gap: 0.5 }}>
            <DarkModeRoundedIcon fontSize="small" />
            {t('marketing.occasions.preview.dark')}
            {flag(!!errors.palette_dark)}
          </ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('marketing.occasions.editor.blankKeeps')}
        </Typography>
        {/* Keyed by mode, so each palette keeps its own "more tokens" state and fields. */}
        <PaletteFields key={mode} control={control} mode={mode} />
      </Stack>
    </SectionCard>
  );
}
