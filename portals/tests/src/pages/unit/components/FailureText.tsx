import { Box, Stack, Typography } from '@mui/material';
import { tokens } from '@duncit/theme';

interface Props {
  text: string;
  /** The heading above it, e.g. "Failure". */
  label: string;
}

/**
 * A failure message as the runner printed it — monospace, wrapped, scrollable
 * past a screenful, and focusable so a keyboard can scroll it too.
 */
export default function FailureText({ text, label }: Readonly<Props>) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" component="h3">
        {label}
      </Typography>
      <Box
        component="pre"
        tabIndex={0}
        aria-label={label}
        sx={{
          m: 0,
          p: 1.5,
          maxHeight: '50vh',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          typography: 'caption',
          fontFamily: tokens.font.mono,
          bgcolor: 'action.hover',
          color: 'text.primary',
          borderRadius: 1,
        }}
      >
        {text}
      </Box>
    </Stack>
  );
}
