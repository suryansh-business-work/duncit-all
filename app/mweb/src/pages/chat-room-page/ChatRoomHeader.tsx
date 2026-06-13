import { Avatar, Box, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface ChatRoomHeaderProps {
  title?: string;
  messageCount: number;
  onBack: () => void;
}

export default function ChatRoomHeader({ title, messageCount, onBack }: Readonly<ChatRoomHeaderProps>) {
  const label = title || 'Chat';

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ px: { xs: 1.25, sm: 2 }, py: 1, bgcolor: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(14px)' }}
    >
      <IconButton onClick={onBack} sx={{ bgcolor: 'action.hover' }}>
        <ArrowBackIcon />
      </IconButton>
      <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main' }}>{label.charAt(0)}</Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 950, lineHeight: 1.1 }} noWrap>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }} noWrap>
          {messageCount} message{messageCount === 1 ? '' : 's'}
        </Typography>
      </Box>
      <IconButton sx={{ bgcolor: 'action.hover' }} aria-label="Chat info">
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}