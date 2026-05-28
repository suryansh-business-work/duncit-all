import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatDistanceToNow } from 'date-fns';
import { BOUNCER_FEEDBACK, type FeedbackEntry } from '../../graphql/bouncer';

const CATEGORY_COLOR: Record<FeedbackEntry['category'], 'default' | 'primary' | 'error' | 'warning' | 'success'> = {
  VENUE: 'primary',
  HOST: 'primary',
  SAFETY: 'error',
  FOOD: 'warning',
  OTHER: 'default',
};

export default function FeedbackDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ bouncerFeedback: FeedbackEntry[] }>(BOUNCER_FEEDBACK, {
    fetchPolicy: 'cache-and-network',
  });

  const fb = data?.bouncerFeedback.find((f) => f.id === id);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/feedback')} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Feedback
        </Typography>
      </Stack>

      {loading && !fb ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !fb ? (
        <Typography variant="body2" color="text.secondary">
          This feedback could not be found.
        </Typography>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
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
              {fb.message && <Typography variant="body1">"{fb.message}"</Typography>}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
