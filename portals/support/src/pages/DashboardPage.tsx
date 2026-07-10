import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ForumIcon from '@mui/icons-material/Forum';
import {
  BOUNCER_SOS_ALERTS,
  BOUNCER_CALLBACK_REQUESTS,
  type SosAlertPage,
  type CallbackRequestPage,
} from '../graphql/bouncer';
import { TICKETS, type TicketPage } from '../graphql/tickets';
import { SUPPORT_CHAT_SESSIONS, type SupportChatSessionPage } from '../graphql/supportChat';
import { useSupportSocket } from '../lib/useSupportSocket';

interface StatCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  to: string;
}

function StatCard({ label, count, icon, color, to }: Readonly<StatCardProps>) {
  const navigate = useNavigate();
  return (
    <Card variant="outlined" sx={{ flex: '1 1 200px', minWidth: 200 }}>
      <CardActionArea onClick={() => navigate(to)}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ color, display: 'flex' }}>{icon}</Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                {count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function DashboardPage() {
  const sos = useQuery<{ bouncerSosAlerts: SosAlertPage }>(BOUNCER_SOS_ALERTS, {
    variables: { status: 'ACTIVE', page_size: 1 },
    fetchPolicy: 'cache-and-network',
  });
  const callbacks = useQuery<{ bouncerCallbackRequests: CallbackRequestPage }>(BOUNCER_CALLBACK_REQUESTS, {
    variables: { status: 'PENDING', page_size: 1 },
    fetchPolicy: 'cache-and-network',
  });
  const tickets = useQuery<{ tickets: TicketPage }>(TICKETS, {
    variables: { status: 'OPEN', page_size: 1 },
    fetchPolicy: 'cache-and-network',
  });
  const chats = useQuery<{ supportChatSessions: SupportChatSessionPage }>(SUPPORT_CHAT_SESSIONS, {
    variables: { status: 'OPEN', page_size: 1 },
    fetchPolicy: 'cache-and-network',
  });

  useSupportSocket({
    onSos: () => sos.refetch(),
    onSosUpdate: () => sos.refetch(),
    onCallback: () => callbacks.refetch(),
    onCallbackUpdate: () => callbacks.refetch(),
    onTicketNew: () => tickets.refetch(),
    onTicketUpdate: () => tickets.refetch(),
    onChatSessionNew: () => chats.refetch(),
    onChatSessionUpdate: () => chats.refetch(),
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Support Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live overview of safety alerts, callbacks, tickets and chats awaiting your team.
        </Typography>
      </Box>

      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
        <StatCard
          label="Active SOS alerts"
          count={sos.data?.bouncerSosAlerts.total ?? 0}
          icon={<WarningAmberIcon fontSize="large" />}
          color="error.main"
          to="/sos"
        />
        <StatCard
          label="Pending callbacks"
          count={callbacks.data?.bouncerCallbackRequests.total ?? 0}
          icon={<PhoneCallbackIcon fontSize="large" />}
          color="warning.main"
          to="/callbacks"
        />
        <StatCard
          label="Open tickets"
          count={tickets.data?.tickets.total ?? 0}
          icon={<ConfirmationNumberIcon fontSize="large" />}
          color="primary.main"
          to="/tickets"
        />
        <StatCard
          label="Open chats"
          count={chats.data?.supportChatSessions.total ?? 0}
          icon={<ForumIcon fontSize="large" />}
          color="success.main"
          to="/live-chat"
        />
      </Stack>
    </Stack>
  );
}
