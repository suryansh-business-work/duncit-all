import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorMode } from '../ColorModeContext';

interface AuthModeToggleProps {
  placement?: 'fixed' | 'inline';
}

export default function AuthModeToggle({ placement = 'fixed' }: Readonly<AuthModeToggleProps>) {
  const colorMode = useColorMode();
  const isDark = colorMode.mode === 'dark';
  const fixed = placement === 'fixed';

  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
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
        aria-label="Toggle color mode"
      >
        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}