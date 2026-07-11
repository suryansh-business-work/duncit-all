import { Box, Paper, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';

/** Primary "Start a conversation" CTA → real-time agent chat. */
export default function StartConversation() {
  const navigate = useNavigate();
  return (
    <Paper
      variant="outlined"
      onClick={() => navigate('/live-chat')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate('/live-chat');
      }}
      sx={{
        p: 1.75,
        borderRadius: 4,
        cursor: 'pointer',
        color: '#fff',
        background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
        boxShadow: '0 14px 28px -14px rgba(255,79,115,0.6)',
      }}
      aria-label="Start a conversation with support"
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.2)' }}>
          <ChatBubbleOutlineIcon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 950 }}>Start a conversation</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Chat with our support team in real time
          </Typography>
        </Box>
        <ChevronRightIcon />
      </Stack>
    </Paper>
  );
}
