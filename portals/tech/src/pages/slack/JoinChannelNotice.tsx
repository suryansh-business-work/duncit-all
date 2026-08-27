import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, AlertTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { notifyError } from '@duncit/dialogs';
import { JOIN_SLACK_CHANNEL, type SlackChannel } from './queries';

interface Props {
  channel: SlackChannel;
  /** Re-reads the channel list and the history once the bot is in. */
  onJoined: () => void;
}

/**
 * The fix for `not_in_channel`, offered where the error appears.
 *
 * Slack refuses to hand over a channel's messages to a bot that is not in it,
 * however many scopes the token holds — membership and permission are separate
 * things, and the error names neither. A PUBLIC channel can be joined from
 * here; a private one cannot be joined by any API at all, so that case gets the
 * instruction to invite the bot from inside Slack instead of a button that
 * would always fail.
 */
export default function JoinChannelNotice({ channel, onJoined }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [joinChannel] = useMutation(JOIN_SLACK_CHANNEL);

  const join = async () => {
    setBusy(true);
    try {
      await joinChannel({ variables: { channel: channel.id } });
      onJoined();
    } catch (err) {
      // Most likely the channels:join scope is missing, and the server's message
      // names it — so show that rather than a generic failure.
      notifyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (channel.is_private) {
    return (
      <Alert severity="warning" square>
        <AlertTitle>{t('tech.slack.notInChannelTitle')}</AlertTitle>
        {t('tech.slack.invitePrivate', { vars: { channel: channel.name } })}
      </Alert>
    );
  }

  return (
    <Alert
      severity="warning"
      square
      action={
        <DuncitButton color="inherit" size="small" onClick={join} disabled={busy}>
          {busy ? t('tech.slack.joining') : t('tech.slack.joinChannel')}
        </DuncitButton>
      }
    >
      <AlertTitle>{t('tech.slack.notInChannelTitle')}</AlertTitle>
      <Stack>{t('tech.slack.inviteBot', { vars: { channel: channel.name } })}</Stack>
    </Alert>
  );
}
