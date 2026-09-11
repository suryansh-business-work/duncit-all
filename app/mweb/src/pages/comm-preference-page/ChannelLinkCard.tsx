import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { CardActionArea, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import type { CommChannelState } from '@duncit/utils';
import IconDisc from '../account-page/IconDisc';

interface Props {
  icon: ReactNode;
  name: string;
  /** Where it goes now — destination plus whether auth messages arrive. */
  summary: string;
  to: string;
  channel: CommChannelState['channel'];
}

/**
 * One channel on the hub: a row in the hub's card, a door and nothing else.
 *
 * There is deliberately no control on this row. Everything about a channel —
 * its categories AND its authentication messages — is on the other side of it,
 * so the reader never has to hold two places in their head for one channel.
 */
export default function ChannelLinkCard({ icon, name, summary, to, channel }: Readonly<Props>) {
  return (
    <CardActionArea
      component={RouterLink}
      to={to}
      data-testid={`comm-channel-${channel}`}
      sx={{ px: 2, py: 1.75, borderRadius: 0 }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <IconDisc>{icon}</IconDisc>
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{name}</Typography>
          <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
            {summary}
          </Typography>
        </Stack>
        <ChevronRightIcon sx={{ color: 'text.secondary' }} />
      </Stack>
    </CardActionArea>
  );
}
