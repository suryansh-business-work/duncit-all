import { Box, Button, FormControlLabel, Switch, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import { useColorMode } from '../../../ColorModeContext';

interface DrawerFooterProps {
  onLogout: () => void;
}

export default function DrawerFooter({ onLogout }: DrawerFooterProps) {
  const colorMode = useColorMode();
  return (
    <Box sx={{ p: 1.5 }}>
      <FormControlLabel
        sx={{
          mx: 0,
          width: '100%',
          justifyContent: 'space-between',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.5,
          px: 1.25,
          py: 0.25,
          mb: 1.25,
        }}
        labelPlacement="start"
        control={
          <Switch
            size="small"
            checked={colorMode.mode === 'dark'}
            onChange={(_e, checked) => colorMode.set(checked ? 'dark' : 'light')}
            color="primary"
            inputProps={{ 'aria-label': 'Toggle dark mode' }}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {colorMode.mode === 'dark' ? (
              <DarkModeIcon fontSize="small" />
            ) : (
              <LightModeIcon fontSize="small" />
            )}
            <Typography variant="body2" fontWeight={600}>
              {colorMode.mode === 'dark' ? 'Dark mode' : 'Light mode'}
            </Typography>
          </Box>
        }
      />
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={onLogout}
      >
        Logout
      </Button>
    </Box>
  );
}
