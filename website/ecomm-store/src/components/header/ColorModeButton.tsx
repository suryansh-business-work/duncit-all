import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

import { useColorMode } from '../../app/providers/ColorModeProvider';
import { useStoreT } from '../../i18n';
import { CircleButton } from '../CircleButton';

/** The dark-mode switch: a pressed toggle, showing the mode one press away. */
export function ColorModeButton() {
  const { t } = useStoreT();
  const { mode, toggle } = useColorMode();
  const isDark = mode === 'dark';
  return (
    <CircleButton aria-label={t('ecommStore.header.darkMode')} aria-pressed={isDark} onClick={toggle}>
      {isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
    </CircleButton>
  );
}
