import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { CommChannelState } from '@duncit/utils';

interface Props {
  icon: ReactNode;
  name: string;
  /** What choosing this channel leads to. */
  hint: string;
  /** Where it goes now — destination plus whether auth messages arrive. */
  summary: string;
  to: string;
  channel: CommChannelState['channel'];
}

/**
 * One channel on the hub: a door, and nothing else.
 *
 * There is deliberately no control on this card. Everything about a channel —
 * its categories AND its authentication messages — is on the other side of it,
 * so the reader never has to hold two places in their head for one channel.
 */
export default function ChannelLinkCard({
  icon,
  name,
  hint,
  summary,
  to,
  channel,
}: Readonly<Props>) {
  return (
    <Card variant="outlined" data-testid={`comm-channel-${channel}`}>
      <CardActionArea component={RouterLink} to={to}>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{
            alignItems: "center"
          }}>
            {icon}
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 600
              }}>
                {name}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {hint}
              </Typography>
              <Typography variant="caption" noWrap sx={{
                color: "text.secondary"
              }}>
                {summary}
              </Typography>
            </Stack>
            <ChevronRightIcon color="action" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
