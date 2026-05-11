import { Box, Button, Stack, SwipeableDrawer, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

interface NotificationsConfirmSheetProps {
  anchor: HTMLElement | null;
  unreadCount: number;
  onClose: () => void;
  onContinue: (anchor: HTMLElement) => void;
}

export default function NotificationsConfirmSheet({
  anchor,
  unreadCount,
  onClose,
  onContinue,
}: NotificationsConfirmSheetProps) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={!!anchor}
      onOpen={() => undefined}
      onClose={onClose}
      PaperProps={{
        sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2 },
      }}
    >
      <Box
        sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 2 }}
      />
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsActiveIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'View notifications'}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Open your inbox to see club updates, new pods and silent moments.
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (anchor) onContinue(anchor);
            }}
          >
            View notifications
          </Button>
        </Stack>
      </Stack>
    </SwipeableDrawer>
  );
}
