import { useState } from 'react';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import AppearanceSection from './settings-page/AppearanceSection';
import JwtExpirySection from './settings-page/JwtExpirySection';
import DisplayFormatsSection from './settings-page/DisplayFormatsSection';
import EnvironmentVariablesSection from './settings-page/EnvironmentVariablesSection';

export default function SettingsPage() {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Personalize your admin experience and configure system behavior.
        </Typography>
      </Box>
      <AppearanceSection />
      <EnvironmentVariablesSection onToast={setToast} />
      <DisplayFormatsSection onToast={setToast} />
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
