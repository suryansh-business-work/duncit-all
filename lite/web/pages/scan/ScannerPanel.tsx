import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useQrScanner } from '@duncit/host-pod-actions/qr-scanner';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent, LiteRegistration } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { LITE_HOST_CHECK_IN_BY_CODE } from '../../graphql/manage';
import { CheckInForm } from '../manage/check-in';
import { ScanResult, type ScanOutcome } from './ScanResult';

/** How long a verdict stays up before the camera looks for the next ticket. */
export const RESUME_AFTER_MS = 2_500;

/**
 * The door: the camera reads a ticket's QR, the check-in runs, the verdict
 * shows, and the camera resumes for the next guest. The camera is released
 * while a verdict is up, so one ticket is never sent twice.
 */
export function ScannerPanel({ event, onChecked }: Readonly<{ event: LiteEvent; onChecked: () => void }>) {
  const { t } = useWebT();
  const [scanning, setScanning] = useState(true);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [checkIn] = useMutation(LITE_HOST_CHECK_IN_BY_CODE);

  const admitted = useCallback(
    (registration: LiteRegistration) => {
      setOutcome({ kind: 'ok', registration });
      onChecked();
    },
    [onChecked],
  );

  const read = useCallback(
    (value: string) => {
      setScanning(false);
      checkIn({ variables: { event_id: event.id, code: value } })
        .then(({ data }) => {
          if (data?.liteHostCheckInByCode) admitted(data.liteHostCheckInByCode);
        })
        .catch((error: unknown) => setOutcome({ kind: 'error', message: parseApiError(error, t('liteWeb.manage.checkIn.failed')) }));
    },
    [checkIn, event.id, admitted, t],
  );

  const { videoRef, canvasRef, error } = useQrScanner(scanning, read);

  useEffect(() => {
    if (!outcome) return undefined;
    const timer = setTimeout(() => {
      setOutcome(null);
      setScanning(true);
    }, RESUME_AFTER_MS);
    return () => clearTimeout(timer);
  }, [outcome]);

  return (
    <Stack spacing={2.5} data-testid="scanner-panel">
      {error ? (
        <Alert severity="warning" data-testid="scan-camera-blocked">
          {t('liteWeb.scan.cameraBlocked')}
        </Alert>
      ) : (
        <Box sx={{ position: 'relative', width: '100%', maxWidth: 420, mx: 'auto', aspectRatio: '1 / 1', borderRadius: `${LITE_RADII.cover}px`, overflow: 'hidden', bgcolor: 'common.black' }} data-testid="scan-camera">
          <Box component="video" ref={videoRef} muted playsInline aria-label={t('liteWeb.scan.cameraLabel')} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <Box aria-hidden sx={{ position: 'absolute', inset: '18%', border: 3, borderColor: 'common.white', borderRadius: `${LITE_RADII.card}px`, opacity: scanning ? 0.9 : 0.3 }} />
        </Box>
      )}
      <Box component="canvas" ref={canvasRef} sx={{ display: 'none' }} />
      <Box aria-live="assertive">{outcome ? <ScanResult outcome={outcome} /> : null}</Box>
      {outcome ? (
        <DuncitButton
          variant="outlined"
          onClick={() => {
            setOutcome(null);
            setScanning(true);
          }}
          sx={{ alignSelf: 'center', borderRadius: LITE_RADII.pill }}
          data-testid="scan-next"
        >
          {t('liteWeb.scan.next')}
        </DuncitButton>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('liteWeb.scan.hint')}
        </Typography>
      )}
      <Stack spacing={1}>
        <Typography variant="body2" component="h2" sx={{ fontWeight: 700 }}>
          {t('liteWeb.scan.manual')}
        </Typography>
        <CheckInForm eventId={event.id} onCheckedIn={admitted} />
      </Stack>
    </Stack>
  );
}
