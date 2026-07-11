import { Box, Button, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

interface DrawerFooterProps {
  onLogout: () => void;
}

export default function DrawerFooter({ onLogout }: Readonly<DrawerFooterProps>) {
  return (
    <Box sx={{ p: 1.5 }}>
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={onLogout}
        sx={{ borderRadius: 999, fontWeight: 900 }}
      >
        Logout
      </Button>
      <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={1}>
        App version {__APP_VERSION__}
      </Typography>
    </Box>
  );
}
