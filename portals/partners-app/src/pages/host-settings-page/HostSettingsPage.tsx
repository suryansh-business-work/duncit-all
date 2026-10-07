import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { RequestLimitForm } from '../pod-requests/request-limit';
import { MY_HOST_SETTINGS, SET_MY_VENUE_REQUEST_LIMIT, type HostSettings } from './queries';

/** Host → Settings: the host's own "Maximum Venue Requests / Month". */
export default function HostSettingsPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data, loading, error: loadError, refetch } = useQuery<{ myHost: HostSettings | null }>(MY_HOST_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, saveState] = useMutation(SET_MY_VENUE_REQUEST_LIMIT);
  const host = data?.myHost ?? null;

  const onSave = async (limit: number) => {
    setError(null);
    try {
      await save({ variables: { limit } });
      setMessage(t('podRequests.limitSaved'));
    } catch (saveError) {
      setError(parseApiError(saveError));
    }
  };

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }} role="status">
        <CircularProgress size={28} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%', pb: 4 }} data-testid="host-settings-page">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        {t('podRequests.hostSettingsTitle')}
      </Typography>
      {loadError && (
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={() => refetch()}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {parseApiError(loadError)}
        </Alert>
      )}
      {!loadError && !host && <Alert severity="info">{t('podRequests.noHost')}</Alert>}
      {host && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                {t('podRequests.hostLimitLabel')}
              </Typography>
              <RequestLimitForm
                label={t('podRequests.hostLimitLabel')}
                limit={host.max_venue_requests_per_month}
                override={host.venue_requests_limit_override}
                saving={saveState.loading}
                error={error}
                onSave={onSave}
              />
            </Stack>
          </CardContent>
        </Card>
      )}
      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)} message={message ?? ''} />
    </Stack>
  );
}
