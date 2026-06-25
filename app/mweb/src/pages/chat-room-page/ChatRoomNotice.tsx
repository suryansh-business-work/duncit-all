import { Box, Chip, Stack, Typography } from '@mui/material';

interface ChatRoomNoticeProps {
  ended?: boolean;
}

export default function ChatRoomNotice({ ended = false }: Readonly<ChatRoomNoticeProps>) {
  return (
    <Box sx={{ mb: 1.5, mx: 'auto', maxWidth: 420, p: 1.25, borderRadius: 3, bgcolor: 'rgba(112,70,255,0.12)', border: '1px solid rgba(112,70,255,0.24)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }}>
            POD CHAT
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
            {ended ? 'This pod has ended' : 'Keep the plan in one place'}
          </Typography>
        </Box>
        {ended ? (
          <Chip size="small" label="Ended" sx={{ fontWeight: 900 }} />
        ) : (
          <Chip size="small" label="Live" color="success" sx={{ fontWeight: 900 }} />
        )}
      </Stack>
    </Box>
  );
}
