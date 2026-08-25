import { useState } from 'react';
import { Alert, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { usePromptCopy } from '../i18n/useCopy';

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
  const copy = usePromptCopy();
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
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
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {copy.apiTitle}
      </Typography>
      <Typography
        variant="caption"
        component="p"
        sx={{
          color: "text.secondary",
          mb: 0.75
        }}>
        {copy.apiHint}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{
        alignItems: "center"
      }}>
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
        <Tooltip title={copied ? copy.apiCopied : label}>
          <IconButton size="small" aria-label={label} onClick={copyUrl}>
            <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'inherit'} />
          </IconButton>
        </Tooltip>
        <Tooltip title={copy.apiOpenInNewTab}>
          <IconButton
            size="small"
            aria-label={copy.apiOpenFeed}
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
