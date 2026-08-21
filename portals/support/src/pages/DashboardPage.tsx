import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ForumIcon from '@mui/icons-material/Forum';
import { PageHeader, StatCard } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import {
  BOUNCER_SOS_ALERTS,
  BOUNCER_CALLBACK_REQUESTS,
  type SosAlertPage,
  type CallbackRequestPage,
} from '../graphql/bouncer';
import { TICKETS, type TicketPage } from '../graphql/tickets';
import { SUPPORT_CHAT_SESSIONS, type SupportChatSessionPage } from '../graphql/supportChat';
import { useSupportSocket } from '../lib/useSupportSocket';
import { useTranslation } from '@duncit/shell';

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
      sx={{ height: '100%' }}
    />
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
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

  // Each queue is its own widget rather than one "KPI strip", so a shift lead
  // can put the count they actually watch first.
  const widgets = useMemo<DashboardWidget[]>(
    () => [
      {
        id: 'sos',
        bare: true,
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
        minW: 2,
        minH: 2,
        content: (
          <SupportStatCard
            label={t('support.dashboard.activeSos')}
            count={sos.data?.bouncerSosAlerts.total ?? 0}
            icon={<WarningAmberIcon fontSize="large" />}
            color="error.main"
            to="/sos"
          />
        ),
      },
      {
        id: 'callbacks',
        bare: true,
        defaultLayout: { x: 3, y: 0, w: 3, h: 2 },
        minW: 2,
        minH: 2,
        content: (
          <SupportStatCard
            label={t('support.dashboard.pendingCallbacks')}
            count={callbacks.data?.bouncerCallbackRequests.total ?? 0}
            icon={<PhoneCallbackIcon fontSize="large" />}
            color="warning.main"
            to="/callbacks"
          />
        ),
      },
      {
        id: 'tickets',
        bare: true,
        defaultLayout: { x: 6, y: 0, w: 3, h: 2 },
        minW: 2,
        minH: 2,
        content: (
          <SupportStatCard
            label={t('support.dashboard.openTickets')}
            count={tickets.data?.tickets.total ?? 0}
            icon={<ConfirmationNumberIcon fontSize="large" />}
            color="primary.main"
            to="/tickets"
          />
        ),
      },
      {
        id: 'chats',
        bare: true,
        defaultLayout: { x: 9, y: 0, w: 3, h: 2 },
        minW: 2,
        minH: 2,
        content: (
          <SupportStatCard
            label={t('support.dashboard.openChats')}
            count={chats.data?.supportChatSessions.total ?? 0}
            icon={<ForumIcon fontSize="large" />}
            color="success.main"
            to="/live-chat"
          />
        ),
      },
    ],
    [sos.data, callbacks.data, tickets.data, chats.data],
  );

  return (
    <DuncitDashboard
      dashboardId="support.overview"
      header={
        <PageHeader
          title={t('support.dashboard.title')}
          subtitle={t('support.dashboard.subtitle')}
        />
      }
      widgets={widgets}
    />
  );
}
