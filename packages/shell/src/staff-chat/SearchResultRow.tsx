import { Box, Stack, Tooltip, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import type { StaffMessage } from './queries';
import type { ChatFormats } from './useChatSettings';

interface Props {
  message: StaffMessage;
  /** Already resolved to a name — the row does not know about users. */
  who: string;
  formats: ChatFormats;
  /** False when the hit is older than the page currently in the thread. */
  loaded: boolean;
  onJump: (id: string) => void;
}

const OLDER_NOTE = 'Older than the messages loaded — open Earlier messages first';

/**
 * One hit.
 *
 * A real button, so it is reachable by keyboard and announces itself; disabled
 * with a reason when the message it points at is not on screen, rather than
 * looking clickable and doing nothing.
 */
export default function SearchResultRow({
  message,
  who,
  formats,
  loaded,
  onJump,
}: Readonly<Props>) {
  const when = message.created_at ? formats.full.format(new Date(message.created_at)) : '';
  const preview = message.text || message.attachment_name || 'Attachment';

  return (
    <Tooltip title={loaded ? '' : OLDER_NOTE}>
      <Box
        component="button"
        type="button"
        disabled={!loaded}
        onClick={() => onJump(message.id)}
        sx={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          border: 0,
          borderRadius: 1,
          bgcolor: 'transparent',
          p: 0.75,
          cursor: loaded ? 'pointer' : 'default',
          opacity: loaded ? 1 : 0.55,
          '&:hover': { bgcolor: loaded ? 'action.selected' : 'transparent' },
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {who}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {when}
          </Typography>
          {message.attachment_url && <AttachFileIcon sx={{ fontSize: 12 }} />}
        </Stack>
        <Typography variant="body2" noWrap>
          {preview}
        </Typography>
      </Box>
    </Tooltip>
  );
}
