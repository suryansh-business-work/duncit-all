import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { useQrScanner } from './useQrScanner';

interface Props {
  active: boolean;
  onCode: (token: string) => void;
  onManualCode: (token: string) => void;
}

/** The live camera frame, plus the paste-the-code fallback for a device that has
 * no camera or has refused it (a desktop browser, or a denied permission). */
export default function ScannerViewport({ active, onCode, onManualCode }: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const { videoRef, canvasRef, error } = useQrScanner(active, onCode);
  const [manual, setManual] = useState('');

  return (
    <Stack spacing={1.25}>
      {!error && (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: 'common.black',
          }}
        >
          <Box
            component="video"
            ref={videoRef}
            muted
            playsInline
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: '18%',
              border: '3px solid rgba(255,255,255,0.85)',
              borderRadius: '12px',
              pointerEvents: 'none',
            }}
          />
        </Box>
      )}
      <Box component="canvas" ref={canvasRef} sx={{ display: 'none' }} />

      {error ? (
        <Alert severity="warning">{error}</Alert>
      ) : (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            textAlign: "center"
          }}>
          {labels.scanFrameHint}
        </Typography>
      )}

      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          label={labels.pasteTicketCode}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <Button
          variant="outlined"
          disabled={!manual.trim()}
          onClick={() => onManualCode(manual.trim())}
          sx={{ borderRadius: 999, fontWeight: 700, flex: '0 0 auto' }}
        >
          {labels.checkCode}
        </Button>
      </Stack>
    </Stack>
  );
}
