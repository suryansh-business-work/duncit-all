import { useState } from 'react';
import { Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { copyToClipboard } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

type CopyState = 'idle' | 'copied' | 'failed';

const TITLE_KEY: Record<CopyState, string> = {
  idle: 'marketing.podPromo.copyLink',
  copied: 'marketing.podPromo.copied',
  failed: 'marketing.podPromo.copyFailed',
};

/** The tracking short link, with a copy button that only says Copied when the copy landed. */
export default function TrackingLink({ url }: Readonly<{ url: string }>) {
  const { t } = useTranslation();
  const [state, setState] = useState<CopyState>('idle');
  const title = t(TITLE_KEY[state]);

  const copy = async () => {
    setState((await copyToClipboard(url)) ? 'copied' : 'failed');
  };

  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {t('marketing.podPromo.trackingLink')}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover', pl: 1.5, pr: 0.5, py: 0.75, minWidth: 0 }}
      >
        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }} data-testid="promo-tracking-url">
          {url}
        </Typography>
        <Tooltip title={title}>
          <DuncitIconButton size="small" aria-label={title} onClick={() => fireAndForget(copy(), logs.portal.marketing, 'pod-promos', 'copyTrackingLink')}>
            <ContentCopyIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
