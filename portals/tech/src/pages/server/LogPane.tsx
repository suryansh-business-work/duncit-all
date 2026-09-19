import { Box } from '@mui/material';

/**
 * Terminal-style, read-only log text — the one pane behind the container logs
 * dialog and the Database › Info MongoDB log. A named region, so a screen
 * reader can jump to it and say what it is; browsers make the scrollable box
 * itself keyboard-focusable, so no tabIndex (the a11y lint forbids one here).
 */
export default function LogPane({ text, label }: Readonly<{ text: string; label: string }>) {
  return (
    <Box
      component="pre"
      role="region"
      aria-label={label}
      data-testid="log-pane"
      sx={{
        bgcolor: '#0b0e14',
        color: '#c9d1d9',
        p: 2,
        m: 0,
        borderRadius: 1,
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 1.5,
        maxHeight: 440,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
      }}
    >
      {text}
    </Box>
  );
}
