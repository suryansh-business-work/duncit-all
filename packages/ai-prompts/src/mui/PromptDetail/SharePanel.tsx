import { Alert, Box, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useDateFormat } from '@duncit/app-settings';
import type { PortalEventInput, PromptDetail } from '../../detailTypes';
import { publicShareUrl } from '../../share/publicApi';
import { libraryPromptUrl } from '../../share/links';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { PlatformSend } from '../shared/PlatformSend';
import { useCopyText } from '../shared/useCopyText';
import { runInBackground } from '../../log';

interface Props {
  detail: PromptDetail;
  /** The AI portal's own origin: public links are its /p/<token> page. */
  portalOrigin: string;
  busy: boolean;
  error: string | null;
  onEnable: (regenerate: boolean) => void;
  onDisable: () => void;
  onEvent: (event: PortalEventInput) => void;
}

function UrlBox({ url }: Readonly<{ url: string }>) {
  return (
    <Box
      component="code"
      sx={{ display: 'block', px: 1, py: 0.75, bgcolor: 'action.hover', borderRadius: 1, overflowWrap: 'anywhere', fontSize: (theme) => theme.typography.caption.fontSize }}
    >
      {url}
    </Box>
  );
}

/**
 * Everything about getting the prompt in front of someone: a public link a
 * stranger can open, the library link for a colleague, and a one-click hand-off
 * to an LLM.
 */
export function SharePanel({ detail, portalOrigin, busy, error, onEnable, onDisable, onEvent }: Readonly<Props>) {
  const copy = useDetailCopy();
  const confirm = useConfirm();
  const { formatDateTime } = useDateFormat();
  const copyText = useCopyText();
  const { prompt, share } = detail;
  const publicUrl = share.enabled && share.token ? publicShareUrl(portalOrigin, share.token) : null;
  const internalUrl = prompt.key ? libraryPromptUrl(portalOrigin, prompt.key, prompt.kind) : null;
  const archived = Boolean(detail.archived_at);

  const copyLink = async (url: string) => {
    if (await copyText(url, copy.actions.linkCopied)) onEvent({ type: 'COPY_LINK' });
  };
  const regenerate = async () => {
    const ok = await confirm({ title: copy.share.regenerate, message: copy.share.regenerateHint, confirmLabel: copy.share.regenerate });
    if (ok) onEnable(true);
  };

  return (
    <Stack spacing={2.5}>
      <Box component="section">
        <Typography variant="subtitle2" component="h3">
          {copy.share.publicTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {copy.share.publicHint}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <FormControlLabel
          control={
            <Switch
              checked={share.enabled}
              disabled={busy || (archived && !share.enabled)}
              onChange={(event) => (event.target.checked ? onEnable(false) : onDisable())}
            />
          }
          label={share.enabled ? copy.share.disable : copy.share.enable}
        />
        {publicUrl ? (
          <Stack spacing={1}>
            <UrlBox url={publicUrl} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <DuncitButton size="small" startIcon={<ContentCopyIcon />} onClick={() => runInBackground(copyLink(publicUrl), 'copyLink')}>
                {copy.share.copyLink}
              </DuncitButton>
              <DuncitButton size="small" startIcon={<AutorenewIcon />} disabled={busy} onClick={() => runInBackground(regenerate(), 'regenerate')}>
                {copy.share.regenerate}
              </DuncitButton>
            </Stack>
            {share.shared_at && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {share.shared_by_name
                  ? copy.share.sharedBy(share.shared_by_name, formatDateTime(share.shared_at))
                  : copy.share.sharedOn(formatDateTime(share.shared_at))}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {copy.share.off}
          </Typography>
        )}
      </Box>

      {internalUrl && (
        <>
          <Divider />
          <Box component="section">
            <Typography variant="subtitle2" component="h3">
              {copy.share.internalTitle}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              {copy.share.internalHint}
            </Typography>
            <DuncitButton size="small" startIcon={<LinkIcon />} onClick={() => runInBackground(copyLink(internalUrl), 'copyLink')}>
              {copy.actions.share}
            </DuncitButton>
          </Box>
        </>
      )}

      <Divider />
      <Box component="section">
        <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
          {copy.share.sendTitle}
        </Typography>
        <PlatformSend text={prompt.content} onEvent={(type, platform) => onEvent({ type, platform })} />
      </Box>
    </Stack>
  );
}
