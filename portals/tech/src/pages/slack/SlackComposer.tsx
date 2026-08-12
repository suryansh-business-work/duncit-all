import { useState, type KeyboardEvent } from 'react';
import { useMutation } from '@apollo/client';
import { Box, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CodeIcon from '@mui/icons-material/Code';
import { useTranslation } from '@duncit/shell';
import { notifyError } from '@duncit/dialogs';
import { SEND_SLACK_MESSAGE } from './queries';

interface Props {
  channelId: string;
  /** Pull the new message into the pane the moment Slack accepts it. */
  onSent: () => void;
}

/**
 * The send half of the conversation. Enter sends, Shift+Enter makes a newline —
 * the convention every chat client shares, so anything else feels broken.
 *
 * Block Kit stays available behind a toggle: it is how this page's messages are
 * actually composed in code, and dropping it would remove the only place to try
 * a payload before shipping it.
 */
export default function SlackComposer({ channelId, onSent }: Readonly<Props>) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [blocks, setBlocks] = useState('');
  const [showBlocks, setShowBlocks] = useState(false);
  const [send, { loading }] = useMutation(SEND_SLACK_MESSAGE);

  const canSend = Boolean(channelId) && !loading && (text.trim() !== '' || blocks.trim() !== '');

  const onSend = async () => {
    if (!canSend) return;
    try {
      await send({
        variables: {
          input: {
            channel: channelId,
            text: text.trim() || undefined,
            blocks_json: blocks.trim() || undefined,
          },
        },
      });
      setText('');
      setBlocks('');
      onSent();
    } catch (err) {
      // The server names the Slack error and the missing scope, so the raw
      // message is the actionable text.
      notifyError(err instanceof Error ? err.message : String(err));
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    onSend().catch(() => undefined);
  };

  return (
    <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('tech.slack.composerPlaceholder')}
          aria-label={t('tech.slack.composerPlaceholder')}
        />
        <Tooltip title={t('tech.slack.blockKitToggle')}>
          <IconButton
            size="small"
            color={showBlocks ? 'primary' : 'default'}
            aria-label={t('tech.slack.blockKitToggle')}
            onClick={() => setShowBlocks((open) => !open)}
          >
            <CodeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('tech.slack.send')}>
          <span>
            <IconButton
              color="primary"
              disabled={!canSend}
              aria-label={t('tech.slack.send')}
              onClick={() => {
                onSend().catch(() => undefined);
              }}
            >
              <SendIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {showBlocks && (
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          sx={{ mt: 1 }}
          value={blocks}
          onChange={(e) => setBlocks(e.target.value)}
          label={t('tech.slack.blockKitLabel')}
          placeholder='[{"type":"section","text":{"type":"mrkdwn","text":"*Hi*"}}]'
        />
      )}
    </Box>
  );
}
