import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader, StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { CHALLENGE_STATS, type ChallengeStats } from '../graphql/challenges';

interface DashboardCard {
  key: keyof ChallengeStats;
  /** Written out as a literal: the build gate greps for literal key strings. */
  labelKey: string;
  icon: React.ReactNode;
}

const CARDS: DashboardCard[] = [
  {
    key: 'total',
    labelKey: 'challenge.dashboard.total',
    icon: <EmojiEventsIcon fontSize="large" color="primary" />,
  },
  {
    key: 'active',
    labelKey: 'challenge.dashboard.active',
    icon: <CheckCircleIcon fontSize="large" color="success" />,
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, loading } = useQuery<{ challengeStats: ChallengeStats }>(CHALLENGE_STATS, {
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.challengeStats;

  const widgets: DashboardWidget[] = CARDS.map((card, index) => ({
    id: card.key,
    bare: true,
    defaultLayout: { x: index * 4, y: 0, w: 4, h: 2 },
    minW: 2,
    minH: 2,
    content: (
      <StatCard
        layout="valueFirst"
        label={t(card.labelKey)}
        value={stats?.[card.key] ?? 0}
        icon={card.icon}
        loading={loading && !stats}
        onClick={() => navigate('/challenges')}
        valueVariant="h4"
        valueSx={{ lineHeight: 1 }}
        sx={{ height: '100%' }}
      />
    ),
  }));

  return (
    <DuncitDashboard
      dashboardId="challenge.overview"
      header={
        <PageHeader
          title={t('challenge.dashboard.title')}
          subtitle={t('challenge.dashboard.subtitle')}
        />
      }
      widgets={widgets}
    />
  );
}
