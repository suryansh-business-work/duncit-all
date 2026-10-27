import { useSyncExternalStore } from 'react';
import { Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useWebT } from '../../../shared/i18n';
import { useDisplayMode } from '../../lib/useDisplayMode';

const noop = () => () => undefined;

const ICONS = { SYSTEM: SettingsBrightnessOutlinedIcon, LIGHT: LightModeOutlinedIcon, DARK: DarkModeOutlinedIcon } as const;

/**
 * One tap through System → Light → Dark, from any page. Drawn after mount:
 * the server cannot know the reader's choice, so the icon would otherwise
 * differ between the server HTML and the first browser render.
 */
export function ModeToggle() {
  const { t } = useWebT();
  const { current, next, choose } = useDisplayMode();
  // false in the server render and during hydration, true once the browser has the page.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  const Icon = ICONS[current];
  const label = t('liteWeb.settings.switchMode', { vars: { mode: t(`liteWeb.settings.modes.${current}`), next: t(`liteWeb.settings.modes.${next}`) } });
  return (
    <Tooltip title={label}>
      <DuncitIconButton aria-label={label} onClick={() => choose(next)} data-testid="mode-toggle">
        <Icon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}
