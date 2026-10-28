import { Box, Stack, Typography } from '@mui/material';
import { tokens } from '@duncit/theme';

interface Props {
  text: string;
  /** The heading above it, e.g. "Failure". */
  label: string;
}

/**
 * A failure message as the runner printed it — monospace, wrapped, scrollable
 * past a screenful. A named region (the LogPane pattern): browsers make the
 * scrollable box itself keyboard-focusable, so no tabIndex.
 */
export default function FailureText({ text, label }: Readonly<Props>) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" component="h3">
        {label}
      </Typography>
      <Box
        component="pre"
        role="region"
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
