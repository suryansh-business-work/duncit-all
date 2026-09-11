import { useNavigate } from 'react-router';
import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { SURFACE_SX } from '../../theme';

/** The row of active pod covers above the list — tap one to open its chat. */
export default function ActivePodsStrip({ rooms }: Readonly<{ rooms: any[] }>) {
  const navigate = useNavigate();
  return (
    <Paper sx={{ ...SURFACE_SX, p: 2 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.4 }}>
        ACTIVE PODS · {rooms.length}
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ mt: 1.25, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {rooms.slice(0, 10).map((room: any) => (
          <Box key={room.id} sx={{ position: 'relative', flex: '0 0 auto' }} onClick={() => navigate(`/chats/${room.id}`)}>
            <Avatar src={room.cover_url || undefined} sx={{ width: 52, height: 52, bgcolor: 'primary.main', cursor: 'pointer' }}>
              <GroupsIcon />
            </Avatar>
            <Box sx={{ position: 'absolute', right: 2, bottom: 2, width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', border: 2, borderColor: 'background.paper' }} />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
