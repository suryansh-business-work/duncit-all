import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { useTranslation } from '@duncit/app-settings';
import type { PreviewMode } from './palette';

interface Props {
  value: PreviewMode;
  onChange: (mode: PreviewMode) => void;
  /** The look pins its own mode, so switching would show nothing different. */
  pinned?: boolean;
}

/** Light / dark switch for a preview. */
export default function ModeToggle({ value, onChange, pinned = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const group = (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      disabled={pinned}
      onChange={(_, next: PreviewMode | null) => next && onChange(next)}
      aria-label={t('marketing.occasions.preview.modeLabel')}
    >
      <ToggleButton value="light" aria-label={t('marketing.occasions.preview.light')}>
        <LightModeRoundedIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="dark" aria-label={t('marketing.occasions.preview.dark')}>
        <DarkModeRoundedIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>
  );
  if (!pinned) return group;
  // Said in words beside the switch: a disabled control takes no focus, so a tooltip would reach no keyboard user.
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {group}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('marketing.occasions.preview.modePinned')}
      </Typography>
    </Stack>
  );
}
