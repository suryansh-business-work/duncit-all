import { useState } from 'react';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import JwtExpirySection from './JwtExpirySection';

export default function AuthenticationPage() {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Authentication</Typography>
        <Typography variant="body2" color="text.secondary">
          Configure how login sessions and access tokens behave across the platform.
        </Typography>
      </Box>
      <JwtExpirySection onToast={setToast} />
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
