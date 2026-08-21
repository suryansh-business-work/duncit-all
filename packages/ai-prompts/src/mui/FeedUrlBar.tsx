import { useState } from 'react';
import { Alert, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { PROMPT_COPY } from '../copy';

interface Props {
  url: string;
  label: string;
}

/**
 * The copyable public feed URL.
 *
 * The warning above it is not decoration. This endpoint has no login and no
 * key, so the URL IS the distribution: anyone it reaches can read every active
 * prompt, code ones included. An operator deciding whether to paste it
 * somewhere needs that sentence in front of them at the moment they copy.
 */
export function FeedUrlBar({ url, label }: Readonly<Props>) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    globalThis.navigator?.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        globalThis.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => setCopied(false));
  };

  return (
    <Alert severity="warning" icon={false} sx={{ py: 1 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        {PROMPT_COPY.apiTitle}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.75 }}>
        {PROMPT_COPY.apiHint}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Box
          component="code"
          sx={{
            flex: 1,
            minWidth: 0,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
            fontSize: 12,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {url}
        </Box>
        <Tooltip title={copied ? PROMPT_COPY.apiCopied : label}>
          <IconButton size="small" aria-label={label} onClick={copy}>
            <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'inherit'} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Open in a new tab">
          <IconButton
            size="small"
            aria-label="Open feed in a new tab"
            component="a"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Alert>
  );
}
