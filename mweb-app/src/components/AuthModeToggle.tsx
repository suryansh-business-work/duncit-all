import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorMode } from '../ColorModeContext';

export default function AuthModeToggle() {
  const colorMode = useColorMode();
  const isDark = colorMode.mode === 'dark';

  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      <IconButton
        onClick={colorMode.toggle}
        sx={{
          position: 'fixed',
          top: 14,
          right: 14,
          zIndex: 10,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: 2,
          '&:hover': { bgcolor: 'action.hover' },
        }}
        aria-label="Toggle color mode"
      >
        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}