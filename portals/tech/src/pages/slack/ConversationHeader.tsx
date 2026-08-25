import { Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from '@duncit/shell';
import { notifySuccess } from '@duncit/dialogs';
import type { SlackChannel } from './queries';

/** Channel identity plus the two things anyone ever wants from it: its id, and
 * a way into the real Slack client. */
export default function ConversationHeader({ channel }: Readonly<{ channel: SlackChannel }>) {
  const { t } = useTranslation();

  const copy = (value: string, message: string) => {
    globalThis.navigator.clipboard
      ?.writeText(value)
      .then(() => notifySuccess(message))
      .catch(() => undefined);
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        px: 2,
        py: 1.25,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: "center"
        }}>
          {channel.is_private ? (
            <LockIcon sx={{ fontSize: 16 }} color="action" />
          ) : (
            <Typography
              component="span"
              sx={{
                color: "text.secondary",
                fontWeight: 800
              }}>
              #
            </Typography>
          )}
          <Typography noWrap sx={{
            fontWeight: 900
          }}>
            {channel.name}
          </Typography>
          {!channel.is_member && (
            <Chip size="small" color="warning" variant="outlined" label={t('tech.slack.notMember')} />
          )}
        </Stack>
        <Typography variant="caption" noWrap sx={{
          color: "text.secondary"
        }}>
          {t('tech.slack.channelMeta', {
            vars: { id: channel.id, members: String(channel.num_members) },
          })}
          {channel.topic ? ` · ${channel.topic}` : ''}
        </Typography>
      </Stack>
      <Tooltip title={t('tech.slack.copyId')}>
        <IconButton
          size="small"
          aria-label={t('tech.slack.copyId')}
          onClick={() => copy(channel.id, t('tech.slack.copiedId'))}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('tech.slack.openInSlack')}>
        <span>
          <IconButton
            size="small"
            component="a"
            href={channel.link}
            target="_blank"
            rel="noreferrer"
            disabled={!channel.link}
            aria-label={t('tech.slack.openInSlack')}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
