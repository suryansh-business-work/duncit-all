import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { CHALLENGE_STATS, type ChallengeStats } from '../graphql/challenges';

interface StatCard {
  key: keyof ChallengeStats;
  label: string;
  icon: React.ReactNode;
}

const CARDS: StatCard[] = [
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
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Challenges Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          An overview of challenges across the platform.
        </Typography>
      </Box>

      {loading && !stats ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
          {CARDS.map((card) => (
            <Card key={card.key} variant="outlined" sx={{ flex: '1 1 220px', minWidth: 220 }}>
              <CardActionArea onClick={() => navigate('/challenges')}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {card.icon}
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                        {stats?.[card.key] ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.label}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
