import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { commRowState, type CommChannelLabels, type CommChannelState } from '@duncit/utils';

interface Props {
  icon: ReactNode;
  labels: CommChannelLabels;
  state: CommChannelState;
  /** Where this channel's own categories live. */
  to: string;
  otpLabel: string;
  otpLockedHint: string;
  busy: boolean;
  onToggleOtp: (enabled: boolean) => void;
}

/**
 * One channel in Communication Preferences: a door to its categories, and the
 * one switch that belongs on this screen rather than behind that door.
 *
 * The door and the switch are deliberately separate hit targets. A
 * `CardActionArea` swallows clicks on anything inside it — a switch nested in
 * one looks interactive and does nothing but navigate.
 */
export default function ChannelPreferenceCard({
  icon,
  labels,
  state,
  to,
  otpLabel,
  otpLockedHint,
  busy,
  onToggleOtp,
}: Readonly<Props>) {
  const row = commRowState(state);
  const otpCaption = row.locked ? otpLockedHint : state.destination;
  // Nothing to send to: say so instead of offering a switch that cannot move.
  const trailing = row.unreachable ? (
    <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 160, textAlign: 'right' }}>
      {labels.missing}
    </Typography>
  ) : (
    <Switch
      checked={state.otp_enabled}
      disabled={!row.canToggle}
      onChange={(event) => onToggleOtp(event.target.checked)}
      inputProps={{ 'aria-label': `${otpLabel} — ${labels.name}` }}
    />
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }} data-testid={`comm-channel-${state.channel}`}>
      <CardActionArea component={RouterLink} to={to}>
        <CardContent sx={{ pb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {icon}
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {labels.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {labels.hint}
              </Typography>
            </Stack>
            <ChevronRightIcon color="action" />
          </Stack>
        </CardContent>
      </CardActionArea>

      <Divider />

      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2, py: 1, minHeight: 56 }}
      >
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>
            {otpLabel}
          </Typography>
          {otpCaption && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {otpCaption}
            </Typography>
          )}
        </Stack>
        {/* The lock is explained on hover as well as in the caption — the
            caption is what a touch device gets, the tooltip what a pointer
            gets, and neither is the only place it is said. */}
        {busy ? (
          <CircularProgress size={20} sx={{ m: 1.25 }} />
        ) : (
          <Tooltip title={row.locked ? otpLockedHint : ''}>
            <span>{trailing}</span>
          </Tooltip>
        )}
      </Stack>
    </Card>
  );
}
