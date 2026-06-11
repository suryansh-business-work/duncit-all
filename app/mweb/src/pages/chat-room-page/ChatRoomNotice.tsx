import { Box, Chip, Stack, Typography } from '@mui/material';

export default function ChatRoomNotice() {
  return (
    <Box sx={{ mb: 1.5, mx: 'auto', maxWidth: 420, p: 1.25, borderRadius: 3, bgcolor: 'rgba(112,70,255,0.12)', border: '1px solid rgba(112,70,255,0.24)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }}>
            POD CHAT
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
            Keep the plan in one place
          </Typography>
        </Box>
        <Chip size="small" label="Live" color="success" sx={{ fontWeight: 900 }} />
      </Stack>
    </Box>
  );
}