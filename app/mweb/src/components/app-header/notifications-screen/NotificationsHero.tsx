import { Avatar, Box, Chip, Stack, Switch, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

/** Background per stacked hero avatar (index 0, 1, 2). */
const AVATAR_BG = ['primary.main', 'secondary.main', 'info.main'];

interface Props {
  total: number;
  pushSupported: boolean;
  pushOn: boolean;
  pushBusy: boolean;
  onToggle: (next: boolean) => void;
}

/** The "Never Miss an Update" banner + the allow-notifications switch. */
export default function NotificationsHero({
  total,
  pushSupported,
  pushOn,
  pushBusy,
  onToggle,
}: Readonly<Props>) {
  return (
    <Box sx={{ px: 1.5, pb: 1.5 }}>
      <Box
        sx={{
          p: 1.5,
          borderRadius: '16px',
          bgcolor: 'rgba(255,79,115,0.12)',
          border: '1px solid rgba(255,79,115,0.22)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Stack direction="row" spacing={-1} sx={{ flex: '0 0 auto' }}>
            {[0, 1, 2].map((index) => (
              <Avatar
                key={index}
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: AVATAR_BG[index],
                  border: 2,
                  borderColor: 'background.paper',
                }}
              >
                <NotificationsActiveIcon fontSize="small" />
              </Avatar>
            ))}
          </Stack>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              Never Miss an Update
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Get real-time updates about your Pods, Clubs, Host activities, Chats, and Account—all
              in one place.
            </Typography>
          </Box>
          <Chip color="primary" label={`${total}`} sx={{ fontWeight: 700 }} />
        </Stack>
        {pushSupported && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Allow notifications
            </Typography>
            <Switch
              checked={pushOn}
              disabled={pushBusy}
              onChange={(_e, next) => onToggle(next)}
              inputProps={{ 'aria-label': 'Allow notifications' }}
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
