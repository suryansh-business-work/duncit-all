import { CircularProgress, Stack, Typography } from '@mui/material';

/** Shown while a scanned code is in flight — the camera is paused until it lands. */
export default function ScanBusy({ text }: Readonly<{ text: string }>) {
  return (
    <Stack
      spacing={1}
      data-testid="ticket-scan-busy"
      sx={{
        alignItems: "center",
        py: 3
      }}>
      <CircularProgress size={24} />
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {text}
      </Typography>
    </Stack>
  );
}
