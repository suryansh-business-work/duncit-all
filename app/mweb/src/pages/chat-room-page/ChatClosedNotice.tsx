import { Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

/** Replaces the composer once a pod has ended — chat is read-only from then on. */
export default function ChatClosedNotice() {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="center"
      sx={{ px: { xs: 1.25, sm: 2 }, py: 1.75 }}
    >
      <LockOutlinedIcon fontSize="small" color="disabled" />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
        This pod has ended — chat is closed.
      </Typography>
    </Stack>
  );
}
