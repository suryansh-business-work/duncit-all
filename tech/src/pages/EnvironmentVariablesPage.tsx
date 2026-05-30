import { useState } from 'react';
import { Box, Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EnvironmentVariablesSection from './environment-variables/EnvironmentVariablesSection';
import EnvironmentScopesTable from './environment-variables/EnvironmentScopesTable';
import type { EnvironmentScope } from './environment-variables/environmentVariables';

export default function EnvironmentVariablesPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [scope, setScope] = useState<EnvironmentScope | null>(null);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Environment Variables
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pick a portal to manage its own runtime configuration. Database overrides win; the server scope falls back to
          process environment values.
        </Typography>
      </Box>

      {scope ? (
        <>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setScope(null)}>
              All portals
            </Button>
            <Typography variant="subtitle1" fontWeight={700}>{scope.label}</Typography>
          </Stack>
          <EnvironmentVariablesSection scope={scope.key} onToast={setToast} />
        </>
      ) : (
        <Card>
          <CardContent>
            <EnvironmentScopesTable onSelect={setScope} />
          </CardContent>
        </Card>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
