import { useNavigate } from 'react-router-dom';
import { Box, Paper, Stack, Typography } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import SensorsIcon from '@mui/icons-material/Sensors';
import SupportShell from './SupportShell';

/**
 * "Chat with Us" — a single entry point into the real-time agent chat. The
 * ticket inbox and the "New ticket" shortcut used to live here too, but this
 * page now offers only "Chat live with an agent" (tickets have their own
 * sections in the Support hub).
 */
export default function LiveTicketsPage() {
  const navigate = useNavigate();

  return (
    <SupportShell
      title="Chat with Us"
      subtitle="Real-time chat with our support team"
      icon={<SensorsIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #4caf50 0%, #2196f3 100%)"
      backTo="/support"
    >
      <Paper
        onClick={() => navigate('/live-chat')}
        variant="outlined"
        sx={{ p: 1.5, borderRadius: 4, bgcolor: 'rgba(33,150,243,0.08)', cursor: 'pointer' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <ForumIcon color="primary" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
              Chat live with an agent
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Get real-time answers without raising a ticket.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </SupportShell>
  );
}
