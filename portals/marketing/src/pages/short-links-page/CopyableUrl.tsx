import { useState } from 'react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyToClipboard } from '@duncit/utils';

interface Props {
  url: string;
  label?: string;
}

/** A URL with a copy button that only says "Copied" when the copy actually
 * landed — the clipboard is unavailable on insecure origins and rejects when
 * the document is not focused. */
export default function CopyableUrl({ url, label }: Readonly<Props>) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    const ok = await copyToClipboard(url);
    setState(ok ? 'copied' : 'failed');
  };

  const TITLES = { idle: 'Copy link', copied: 'Copied', failed: 'Could not copy — select it' };

  return (
    <Stack spacing={0.25}>
      {label && (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      )}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
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
