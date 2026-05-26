import { useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { BOUNCER_FEEDBACK, type FeedbackEntry } from './queries';

const CATEGORY_COLOR: Record<FeedbackEntry['category'], 'default' | 'primary' | 'error' | 'warning' | 'success'> = {
  VENUE: 'primary',
  HOST: 'primary',
  SAFETY: 'error',
  FOOD: 'warning',
  OTHER: 'default',
};

interface Props {
  liveItems: FeedbackEntry[];
}

export default function FeedbackTab({ liveItems }: Props) {
  const { data, loading } = useQuery<{ bouncerFeedback: FeedbackEntry[] }>(BOUNCER_FEEDBACK, {
    fetchPolicy: 'cache-and-network',
  });

  const queried = data?.bouncerFeedback ?? [];
  const merged = mergeById(liveItems, queried);

  if (loading && !merged.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!merged.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No feedback yet. Live feedback will appear here as users submit.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {merged.map((fb) => {
        const isLive = liveItems.some((l) => l.id === fb.id);
        return (
          <Card
            key={fb.id}
            variant="outlined"
            sx={
              isLive
                ? {
                    borderColor: 'primary.main',
                    animation: 'fb-pulse 1.2s ease-in-out 2',
                    '@keyframes fb-pulse': {
                      '0%, 100%': { boxShadow: '0 0 0 0 rgba(25,118,210,0)' },
                      '50%': { boxShadow: '0 0 0 6px rgba(25,118,210,0.2)' },
                    },
                  }
                : undefined
            }
          >
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Rating value={fb.rating} readOnly size="small" />
                    <Chip size="small" color={CATEGORY_COLOR[fb.category]} label={fb.category} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                  </Typography>
                </Stack>
                <Typography variant="body2">
                  <strong>{fb.user.name}</strong> on <em>{fb.pod.title}</em>
                  {fb.pod.venue_name ? ` · ${fb.pod.venue_name}` : ''}
                  {fb.host ? ` · host: ${fb.host.name}` : ''}
                </Typography>
                {fb.message && <Typography variant="body2">"{fb.message}"</Typography>}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function mergeById<T extends { id: string; created_at: string }>(live: T[], queried: T[]): T[] {
  const map = new Map<string, T>();
  queried.forEach((q) => map.set(q.id, q));
  live.forEach((l) => map.set(l.id, l));
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
