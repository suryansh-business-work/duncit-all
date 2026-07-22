import { Avatar, Box, ButtonBase, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface ChatRoomHeaderProps {
  title?: string;
  messageCount: number;
  onBack: () => void;
  /** Opens the linked pod's detail page (group name is tappable). */
  onOpenPod: () => void;
}

export default function ChatRoomHeader({
  title,
  messageCount,
  onBack,
  onOpenPod,
}: Readonly<ChatRoomHeaderProps>) {
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
      <ButtonBase
        data-testid="chat-room-open-pod"
        onClick={onOpenPod}
        aria-label={`Open pod details for ${label}`}
        sx={{ flex: 1, minWidth: 0, borderRadius: 2, py: 0.5, justifyContent: 'flex-start' }}
      >
        <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', mr: 1 }}>{label.charAt(0)}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 950, lineHeight: 1.1 }} noWrap>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }} noWrap>
            {messageCount} message{messageCount === 1 ? '' : 's'}
          </Typography>
        </Box>
        <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </ButtonBase>
    </Stack>
  );
}