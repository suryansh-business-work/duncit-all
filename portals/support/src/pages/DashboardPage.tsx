import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ForumIcon from '@mui/icons-material/Forum';
import { PageHeader, StatCard } from '@duncit/ui';
import {
  BOUNCER_SOS_ALERTS,
  BOUNCER_CALLBACK_REQUESTS,
  type SosAlertPage,
  type CallbackRequestPage,
} from '../graphql/bouncer';
import { TICKETS, type TicketPage } from '../graphql/tickets';
import { SUPPORT_CHAT_SESSIONS, type SupportChatSessionPage } from '../graphql/supportChat';
import { useSupportSocket } from '../lib/useSupportSocket';

interface SupportStatCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  to: string;
}

/** One dashboard KPI tile: icon-left count that navigates to its list page. */
function SupportStatCard({ label, count, icon, color, to }: Readonly<SupportStatCardProps>) {
  const navigate = useNavigate();
  return (
    <StatCard
      layout="valueFirst"
      label={label}
      value={count}
      icon={icon}
      iconColor={color}
      onClick={() => navigate(to)}
      valueVariant="h4"
      valueSx={{ lineHeight: 1 }}
      sx={{ flex: '1 1 200px', minWidth: 200 }}
    />
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
      <PageHeader
        title="Support Dashboard"
        subtitle="Live overview of safety alerts, callbacks, tickets and chats awaiting your team."
      />

      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
        <SupportStatCard
          label="Active SOS alerts"
          count={sos.data?.bouncerSosAlerts.total ?? 0}
          icon={<WarningAmberIcon fontSize="large" />}
          color="error.main"
          to="/sos"
        />
        <SupportStatCard
          label="Pending callbacks"
          count={callbacks.data?.bouncerCallbackRequests.total ?? 0}
          icon={<PhoneCallbackIcon fontSize="large" />}
          color="warning.main"
          to="/callbacks"
        />
        <SupportStatCard
          label="Open tickets"
          count={tickets.data?.tickets.total ?? 0}
          icon={<ConfirmationNumberIcon fontSize="large" />}
          color="primary.main"
          to="/tickets"
        />
        <SupportStatCard
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
