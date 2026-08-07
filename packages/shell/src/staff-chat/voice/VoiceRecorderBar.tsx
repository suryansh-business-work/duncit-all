import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';

interface Props {
  seconds: number;
  /** Live loudness, 0–1 — what makes the bar look connected to a voice. */
  level: number;
  onCancel: () => void;
  onSend: () => void;
}

const BARS = 28;

const clock = (value: number) =>
  `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

/**
 * Replaces the composer while a voice note is being recorded.
 *
 * The bars move with the microphone rather than animating on a timer: a
 * decorative animation looks identical whether or not anything is being picked
 * up, which is exactly the question somebody recording wants answered.
 */
export default function VoiceRecorderBar({
  seconds,
  level,
  onCancel,
  onSend,
}: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 0.5 }}>
      <Tooltip title="Discard">
        <IconButton size="small" color="error" onClick={onCancel} aria-label="Discard voice note">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'error.main',
          animation: 'staffVoicePulse 1.2s ease-in-out infinite',
          '@keyframes staffVoicePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />

      <Typography variant="caption" sx={{ minWidth: 34 }}>
        {clock(seconds)}
      </Typography>

      <Stack direction="row" spacing="2px" alignItems="center" sx={{ flex: 1, height: 24 }}>
        {Array.from({ length: BARS }, (_, index) => {
          // A standing wave whose HEIGHT is the live level: neighbouring bars
          // differ so it reads as sound rather than a progress bar.
          const wobble = 0.55 + 0.45 * Math.sin(index * 0.9);
          return (
            <Box
              key={`live-${index}`}
              sx={{
                flex: 1,
                minWidth: 2,
                borderRadius: 1,
                height: `${Math.max(10, level * wobble * 100)}%`,
                bgcolor: 'error.light',
                transition: 'height 90ms linear',
              }}
            />
          );
        })}
      </Stack>

      <Tooltip title="Send">
        <IconButton size="small" color="primary" onClick={onSend} aria-label="Send voice note">
          <SendIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
