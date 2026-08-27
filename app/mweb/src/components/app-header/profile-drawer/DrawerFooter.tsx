import { Box, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { DuncitButton } from '@duncit/buttons';

interface DrawerFooterProps {
  onLogout: () => void;
}

export default function DrawerFooter({ onLogout }: Readonly<DrawerFooterProps>) {
  return (
    <Box sx={{ p: 1.5 }}>
      <DuncitButton
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={onLogout}
        sx={{ borderRadius: 999, fontWeight: 700 }}
      >
        Logout
      </DuncitButton>
      <Typography
        variant="caption"
        sx={{
          color: "text.disabled",
          display: "block",
          textAlign: "center",
          mt: 1
        }}>
        App version {__APP_VERSION__}
      </Typography>
    </Box>
  );
}
