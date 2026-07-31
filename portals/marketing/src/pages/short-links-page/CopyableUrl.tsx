import { useState } from 'react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyToClipboard } from '@duncit/utils';

interface Props {
  url: string;
  label?: string;
}

const TITLES = {
  idle: 'Copy link',
  copied: 'Copied',
  failed: 'Could not copy — select it',
} as const;

/**
 * A URL as a bordered copy field, with the button pinned to the field's right
 * edge. It is drawn as a field on purpose: laid out as loose text, the button
 * ends up an entire screen away from the URL on a wide monitor and reads as
 * though it belongs to something else.
 *
 * It only says "Copied" when the copy actually landed — the clipboard is
 * unavailable on insecure origins and rejects when the document is not focused.
 */
export default function CopyableUrl({ url, label }: Readonly<Props>) {
  const [state, setState] = useState<keyof typeof TITLES>('idle');

  const copy = async () => {
    const ok = await copyToClipboard(url);
    setState(ok ? 'copied' : 'failed');
  };

  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      {label && (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      )}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
          pl: 1.5,
          pr: 0.5,
          py: 0.75,
          minWidth: 0,
        }}
      >
        <Typography
          variant="body2"
          fontFamily="monospace"
          sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}
        >
          {url}
        </Typography>
        <Tooltip title={TITLES[state]}>
          <IconButton
            size="small"
            aria-label={TITLES[state]}
            sx={{ flexShrink: 0 }}
            onClick={() => {
              copy().catch(() => setState('failed'));
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
