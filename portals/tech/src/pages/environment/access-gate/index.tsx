import type { ReactNode } from 'react';
import { Alert, Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockClockIcon from '@mui/icons-material/LockClock';
import { DuncitButton } from '@duncit/buttons';
import { formatTime, useTranslation } from '@duncit/app-settings';
import EnvAccessForm from './env-access.form';
import SecretWarning from './SecretWarning';
import { useEnvAccess } from './useEnvAccess';

/**
 * The second door in front of every Environment Variables surface: even a
 * signed-in session must type the code emailed to the root admin. The server
 * enforces the same unlock on every env resolver — this only shows the door.
 */
export default function EnvAccessGate({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const gate = useEnvAccess();

  if (gate.loading) return <LinearProgress aria-label={t('shell.nav.environmentVariables')} />;

  if (gate.error || !gate.access) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton size="small" color="inherit" onClick={gate.retry}>
            {t('shell.common.retry')}
          </DuncitButton>
        }
      >
        {t('tech.environment.accessStatusError')}
      </Alert>
    );
  }

  if (gate.access.unlocked) {
    return (
      <Stack spacing={2}>
        <Alert
          severity="success"
          variant="outlined"
          icon={<LockClockIcon />}
          action={
            <DuncitButton
              size="small"
              color="inherit"
              startIcon={<LockIcon />}
              loading={gate.locking}
              onClick={gate.lock}
              data-testid="env-access-lock"
            >
              {t('tech.environment.accessLockNow')}
            </DuncitButton>
          }
          sx={{ alignItems: 'center', '& .MuiAlert-action': { pt: 0 } }}
        >
          {t('tech.environment.accessUnlocked', {
            vars: { time: gate.access.expires_at ? formatTime(gate.access.expires_at) : '' },
          })}
        </Alert>
        {children}
      </Stack>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 1, md: 4 } }}>
      <Card component="section" aria-labelledby="env-access-title" sx={{ width: '100%', maxWidth: 560 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <LockIcon color="primary" fontSize="large" />
              <Typography id="env-access-title" variant="h6" component="h2" sx={{ fontWeight: 800 }}>
                {t('tech.environment.accessTitle')}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tech.environment.accessSubtitle', { vars: { email: gate.access.sent_to } })}
            </Typography>
            <SecretWarning />
            <EnvAccessForm
              pending={gate.pending}
              sending={gate.sending}
              verifying={gate.verifying}
              onSend={gate.send}
              onVerify={gate.verify}
            />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
