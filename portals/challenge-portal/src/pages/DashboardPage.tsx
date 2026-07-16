import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Stack } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader, StatCard } from '@duncit/ui';
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

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Challenges Dashboard"
        subtitle="An overview of challenges across the platform."
      />

      {loading && !stats ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
          {CARDS.map((card) => (
            <StatCard
              key={card.key}
              layout="valueFirst"
              label={card.label}
              value={stats?.[card.key] ?? 0}
              icon={card.icon}
              onClick={() => navigate('/challenges')}
              valueVariant="h4"
              valueSx={{ lineHeight: 1 }}
              sx={{ flex: '1 1 220px', minWidth: 220 }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
