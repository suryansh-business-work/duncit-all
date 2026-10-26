import { Box, Stack } from '@mui/material';
import CopyButton from './CopyButton';

interface CodeBlockProps {
  code: string;
  /** Names the block for the copy button, e.g. "Copy the command". Omit for no button. */
  copyLabel?: string;
}

/**
 * Text to read or paste exactly as it is — a URL, a command, a JSON document.
 * It wraps rather than scrolling sideways, so a long one grows the page (or
 * the drawer) it sits in instead of hiding behind a scroller of its own.
 */
export default function CodeBlock({ code, copyLabel }: Readonly<CodeBlockProps>) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Box
        component="pre"
        sx={{
          flex: 1,
          minWidth: 0,
          m: 0,
          px: 1.5,
          py: 1,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          // The baseline already sets <pre> in the mono face; only the size is ours.
          fontSize: (theme) => theme.typography.caption.fontSize,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {code}
      </Box>
      {copyLabel ? <CopyButton text={code} label={copyLabel} /> : null}
    </Stack>
  );
}
