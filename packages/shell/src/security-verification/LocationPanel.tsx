import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { AlternativePanel } from './AlternativePanel';
import { SecurityLocationMap } from './SecurityLocationMap';
import type { ExceptionStatus } from './documents';
import type { GeolocationStatus, LocationFix } from './useGeolocation';

interface Props {
  status: GeolocationStatus;
  fix: LocationFix | null;
  onRequest: () => void;
  exception: ExceptionStatus | null;
  alternativeBusy: boolean;
  alternativeError: string | null;
  onRequestAlternative: (reason: string) => Promise<void>;
}

const FAILED: readonly GeolocationStatus[] = ['denied', 'unavailable', 'timeout', 'unsupported'];

/**
 * The person's current location on a map, and what happens when there is none.
 *
 * A refusal is explained, not worked around: the screen says why a location is
 * needed, how to allow it, and — separately — how to ask an administrator for
 * another way. There is no skip.
 */
export function LocationPanel({
  status,
  fix,
  onRequest,
  exception,
  alternativeBusy,
  alternativeError,
  onRequestAlternative,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const failed = FAILED.includes(status);
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="security-location">
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" component="h2">
          {t('shell.securityVerification.location.title')}
        </Typography>
        {fix ? (
          <SecurityLocationMap
            latitude={fix.latitude}
            longitude={fix.longitude}
            accuracyMeters={fix.accuracy}
            title={t('shell.securityVerification.map.title')}
          />
        ) : (
          <Box
            sx={{ minHeight: 120, display: 'grid', placeItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              {t('shell.securityVerification.map.placeholder')}
            </Typography>
          </Box>
        )}
        {status === 'granted' && (
          <Alert severity="success" role="status" data-testid="security-location-granted">
            {t('shell.securityVerification.location.granted')}
          </Alert>
        )}
        {failed && (
          <Alert severity="warning" role="alert" data-testid="security-location-failed">
            {locationFailureMessage(status, t)}
          </Alert>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('shell.securityVerification.location.why')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <DuncitButton
            variant="contained"
            onClick={onRequest}
            disabled={status === 'requesting' || status === 'unsupported'}
            startIcon={status === 'requesting' ? <CircularProgress size={16} color="inherit" /> : <MyLocationIcon />}
            data-testid="security-location-request"
          >
            {locationButtonLabel(status, t)}
          </DuncitButton>
        </Stack>
        {failed && (
          <Alert severity="info" data-testid="security-location-restriction">
            {t('shell.securityVerification.location.restriction')}
          </Alert>
        )}
        {(failed || exception !== null) && (
          <AlternativePanel
            exception={exception}
            busy={alternativeBusy}
            error={alternativeError}
            onRequest={onRequestAlternative}
          />
        )}
      </Stack>
    </Paper>
  );
}

// Each key is written out in full: the translation gate reads literal t('key') calls.
function locationFailureMessage(status: GeolocationStatus, t: (key: string) => string): string {
  switch (status) {
    case 'denied':
      return t('shell.securityVerification.location.denied');
    case 'timeout':
      return t('shell.securityVerification.location.timeout');
    case 'unsupported':
      return t('shell.securityVerification.location.unsupported');
    default:
      return t('shell.securityVerification.location.unavailable');
  }
}

function locationButtonLabel(status: GeolocationStatus, t: (key: string) => string): string {
  if (status === 'requesting') return t('shell.securityVerification.location.requesting');
  if (status === 'granted') return t('shell.securityVerification.location.refresh');
  if (FAILED.includes(status)) return t('shell.securityVerification.location.retry');
  return t('shell.securityVerification.location.request');
}
