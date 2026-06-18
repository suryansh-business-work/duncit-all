import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { format } from 'date-fns';
import { userMessageTick } from './chatHelpers';
import type { SupportChatMessage } from './queries';

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif)$/i;

function Tick({ msg, agentLastReadAt }: Readonly<{ msg: SupportChatMessage; agentLastReadAt: string | null }>) {
  const state = userMessageTick(msg, agentLastReadAt);
  if (state === 'pending') return <AccessTimeIcon sx={{ fontSize: 14, opacity: 0.7 }} />;
  return <DoneAllIcon sx={{ fontSize: 15, color: state === 'seen' ? '#34b7f1' : 'inherit', opacity: state === 'seen' ? 1 : 0.7 }} />;
}

function Attachment({ url }: Readonly<{ url: string }>) {
  if (IMAGE_RE.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Avatar variant="rounded" src={url} sx={{ width: 56, height: 56 }} />
      </a>
    );
  }
  return (
    <Chip
      component="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      clickable
      size="small"
      icon={<InsertDriveFileIcon />}
      label="Attachment"
    />
  );
}

interface Props {
  msg: SupportChatMessage;
  agentLastReadAt: string | null;
}

export default function ChatBubble({ msg, agentLastReadAt }: Readonly<Props>) {
  if (msg.sender_role === 'SYSTEM') {
    return (
      <Stack alignItems="center" sx={{ my: 0.5 }}>
        <Chip size="small" label={msg.text} sx={{ bgcolor: 'action.hover', fontWeight: 700, height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' } }} />
      </Stack>
    );
  }

  const isUser = msg.sender_role === 'USER';
  const label = msg.is_ai ? 'Duncit Assistant' : msg.sender_name || 'Support';

  return (
    <Stack direction="row" sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }} spacing={1}>
      {!isUser && (
        <Avatar src={msg.sender_photo || undefined} sx={{ width: 28, height: 28, fontSize: 12, bgcolor: msg.is_ai ? 'secondary.main' : undefined }}>
          {msg.is_ai ? <SmartToyIcon sx={{ fontSize: 16 }} /> : label[0]?.toUpperCase() || 'S'}
        </Avatar>
      )}
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          px: 1.25,
          maxWidth: '80%',
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {!isUser && (
          <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>
            {label}
          </Typography>
        )}
        {msg.text && <Typography variant="body2">{msg.text}</Typography>}
        {msg.attachments.length > 0 && (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5, mt: msg.text ? 0.5 : 0 }}>
            {msg.attachments.map((url) => (
              <Attachment key={url} url={url} />
            ))}
          </Stack>
        )}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ justifyContent: 'flex-end', mt: 0.25 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {format(new Date(msg.created_at), 'HH:mm')}
          </Typography>
          {isUser && <Tick msg={msg} agentLastReadAt={agentLastReadAt} />}
        </Stack>
      </Paper>
    </Stack>
  );
}
