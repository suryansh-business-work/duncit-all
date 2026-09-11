import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import { HEADER_BUTTON_SX } from '../support-chat/calmStyles';

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
      spacing={1.5}
      sx={{
        alignItems: "center",
        px: { xs: 1.25, sm: 2 },
        py: 1,
        bgcolor: 'background.default',
      }}>
      <DuncitRoundButton onClick={onBack} sx={HEADER_BUTTON_SX}>
        <ArrowBackRoundedIcon />
      </DuncitRoundButton>
      <ButtonBase
        data-testid="chat-room-open-pod"
        onClick={onOpenPod}
        aria-label={`Open pod details for ${label}`}
        sx={{ flex: 1, minWidth: 0, borderRadius: '14px', py: 0.5, justifyContent: 'flex-start' }}
      >
        <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          <Typography component="h1" sx={{ fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {label}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: "text.secondary",
              fontWeight: 500
            }}>
            {messageCount} message{messageCount === 1 ? '' : 's'}
          </Typography>
        </Box>
        <ChevronRightRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </ButtonBase>
    </Stack>
  );
}