import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorMode } from '../ColorModeContext';
import { useTranslation } from '../i18n/useTranslation';

interface AuthModeToggleProps {
  placement?: 'fixed' | 'inline';
}

export default function AuthModeToggle({ placement = 'fixed' }: Readonly<AuthModeToggleProps>) {
  const { t } = useTranslation();
  const colorMode = useColorMode();
  const isDark = colorMode.mode === 'dark';
  const fixed = placement === 'fixed';
  // Whole sentences, not a word slotted into one: "light"/"dark" do not
  // decline the same way in every language.
  const tooltip = isDark ? t('mweb.auth.switchToLight') : t('mweb.auth.switchToDark');

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={colorMode.toggle}
        size={fixed ? 'medium' : 'small'}
        sx={{
          ...(fixed && {
            position: 'fixed',
            top: 14,
            right: 14,
            zIndex: 10,
          }),
          minWidth: 40,
          minHeight: 40,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: fixed ? 2 : 0,
          '&:hover': { bgcolor: 'action.hover' },
        }}
        aria-label={t('mweb.auth.toggleColorMode')}
      >
        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}