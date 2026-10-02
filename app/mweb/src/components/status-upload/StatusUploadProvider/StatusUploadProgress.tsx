import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material';
import type { StatusUploadState } from './types';

/** The floating progress card shown while a status uploads. */
export default function StatusUploadProgress({ upload }: Readonly<{ upload: StatusUploadState }>) {
  return (
    <Box
      data-testid="status-upload-progress"
      sx={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 10px)', zIndex: 1400 }}
    >
      <Alert severity="info" variant="filled" sx={{ boxShadow: 6 }}>
        <Stack spacing={0.75}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              justifyContent: "space-between"
            }}>
            <Typography variant="body2" sx={{
              fontWeight: 600
            }}>{upload.message}</Typography>
            <Typography variant="caption" sx={{
              fontWeight: 600
            }}>{upload.progress}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={upload.progress} color="inherit" />
        </Stack>
      </Alert>
    </Box>
  );
}
