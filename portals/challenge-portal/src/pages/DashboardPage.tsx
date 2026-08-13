import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader, StatCard } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { CHALLENGE_STATS, type ChallengeStats } from '../graphql/challenges';

interface DashboardCard {
  key: keyof ChallengeStats;
  label: string;
  icon: React.ReactNode;
}

const CARDS: DashboardCard[] = [
  { key: 'total', label: 'Total challenges', icon: <EmojiEventsIcon fontSize="large" color="primary" /> },
  { key: 'active', label: 'Active challenges', icon: <CheckCircleIcon fontSize="large" color="success" /> },
];

export default function DashboardPage() {
  const navigate = useNavigate();
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
        label={card.label}
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
          title="Challenges Dashboard"
          subtitle="An overview of challenges across the platform."
        />
      }
      widgets={widgets}
    />
  );
}
