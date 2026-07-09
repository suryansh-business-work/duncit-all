import { Chip, Paper, Stack, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import type { SupportChatMessage } from '../../../graphql/supportChat';
import AttachmentList from '../../../components/AttachmentList';
import MessageTicks, { tickState } from './MessageTicks';

interface Props {
  message: SupportChatMessage;
  time: string;
  userLastReadAt: string | null;
}

/** One chat bubble — agent right (with AI badge + read-ticks), user left. */
export default function MessageBubble({ message: m, time, userLastReadAt }: Readonly<Props>) {
  const isAgent = m.sender_role === 'AGENT';
  return (
    <Stack direction="row" sx={{ justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          px: 1.25,
          maxWidth: '70%',
          bgcolor: isAgent ? 'primary.main' : 'background.paper',
          color: isAgent ? 'primary.contrastText' : 'text.primary',
          borderColor: isAgent ? 'primary.main' : 'divider',
        }}
      >
        {isAgent && m.is_ai && (
          <Chip
            size="small"
            icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
            label="AI"
            sx={{ mb: 0.5, height: 18, '& .MuiChip-label': { px: 0.5, fontSize: 10, fontWeight: 700 } }}
          />
        )}
        {m.text && <Typography variant="body2">{m.text}</Typography>}
        <AttachmentList urls={m.attachments} size={52} />
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.25 }}>
          {time}
          {isAgent && <MessageTicks state={tickState(m.id, m.created_at, userLastReadAt)} />}
        </Typography>
      </Paper>
    </Stack>
  );
}
