import { useState } from 'react';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import EnvironmentVariablesSection from './environment-variables/EnvironmentVariablesSection';

export default function EnvironmentVariablesPage() {
  const [toast, setToast] = useState<string | null>(null);
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Environment Variables
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage runtime configuration for every Duncit service from one place.
        </Typography>
      </Box>
      <EnvironmentVariablesSection onToast={setToast} />
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
