import { AudioWave, useMediaStreamSource } from '@audiowave/react';
import { Box, Typography, useTheme } from '@mui/material';

interface Props {
  stream: MediaStream | null;
  label: string;
}

/**
 * The bar along the bottom of a call.
 *
 * An audio call is a black rectangle with a timer on it — nothing on screen
 * says whether the line is actually carrying anything. A waveform answers the
 * question people actually have ("can they hear me / are they still there")
 * without anybody having to say "hello?" twice.
 */
export default function CallWaveform({ stream, label }: Readonly<Props>) {
  const theme = useTheme();
  // Null while the call is connecting; the component simply draws nothing.
  const { source } = useMediaStreamSource(stream);

  return (
    <Box sx={{ px: 1.5, pb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <AudioWave
        source={source ?? undefined}
        width="100%"
        height={44}
        barWidth={3}
        gap={2}
        rounded={2}
        speed={3}
        backgroundColor="transparent"
        barColor={theme.palette.primary.main}
        secondaryBarColor={theme.palette.divider}
      />
    </Box>
  );
}
