import type { ReactNode } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';

import { useColorMode } from '../../app/providers/ColorModeProvider';
import type { ColorPreference } from '../../lib/preferences';
import { useStoreT } from '../../i18n';
import { PrefSection } from './PrefSection';
import { TOGGLE_GROUP_SX } from './prefs.styles';

const COLOR_OPTIONS: ReadonlyArray<{ value: ColorPreference; labelKey: string; icon: ReactNode }> = [
  { value: 'light', labelKey: 'ecommStore.prefs.colorLight', icon: <LightModeOutlinedIcon /> },
  { value: 'dark', labelKey: 'ecommStore.prefs.colorDark', icon: <DarkModeOutlinedIcon /> },
  { value: 'system', labelKey: 'ecommStore.prefs.colorSystem', icon: <SettingsBrightnessOutlinedIcon /> },
];

/** Exclusive group buttons always pass the picked value or null; keep only real choices. */
const asColor = (value: unknown): ColorPreference | undefined => COLOR_OPTIONS.find((option) => option.value === value)?.value;

/** Light, dark, or follow the device. */
export function AppearanceSection() {
  const { t } = useStoreT();
  const { prefs, setPrefs } = useColorMode();
  return (
    <PrefSection title={t('ecommStore.prefs.appearance')}>
      {(headingId) => (
        <ToggleButtonGroup
          exclusive
          value={prefs.color}
          aria-labelledby={headingId}
          onChange={(_event, value: unknown) => {
            const color = asColor(value);
            if (color) setPrefs({ color });
          }}
          sx={TOGGLE_GROUP_SX}
        >
          {COLOR_OPTIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value} data-testid={`prefs-color-${option.value}`}>
              {option.icon}
              {t(option.labelKey)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
    </PrefSection>
  );
}
