import { Box, Paper, Stack, Switch, Typography } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { SURFACE_SX } from '../../../theme';
import { testIdProps } from '../../../utils/testIdProps';

interface Props {
  pushSupported: boolean;
  pushOn: boolean;
  pushBusy: boolean;
  onToggle: (next: boolean) => void;
}

/** The allow-notifications switch, in one calm card. Native twin:
 * components/notifications/NotificationsHero. */
export default function NotificationsHero({
  pushSupported,
  pushOn,
  pushBusy,
  onToggle,
}: Readonly<Props>) {
  if (!pushSupported) return null;
  return (
    <Box data-testid="notifications-hero" sx={{ px: 2, pb: 1.5, flexShrink: 0 }}>
      <Paper sx={{ ...SURFACE_SX, px: 2, py: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <NotificationsNoneRoundedIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
            Allow notifications
          </Typography>
          <Switch
            data-testid="notifications-allow-switch"
            checked={pushOn}
            disabled={pushBusy}
            onChange={(_e, next) => onToggle(next)}
            slotProps={{
              input: { 'aria-label': 'Allow notifications', ...testIdProps('notifications-allow-switch-input') }
            }}
          />
        </Stack>
      </Paper>
    </Box>
  );
}
