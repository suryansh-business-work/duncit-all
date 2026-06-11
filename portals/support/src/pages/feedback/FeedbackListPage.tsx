import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  Rating,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { BOUNCER_FEEDBACK, type FeedbackEntry } from '../../graphql/bouncer';
import { useSupportSocket } from '../../lib/useSupportSocket';

const CATEGORY_COLOR: Record<FeedbackEntry['category'], 'default' | 'primary' | 'error' | 'warning' | 'success'> = {
  VENUE: 'primary',
  HOST: 'primary',
  SAFETY: 'error',
  FOOD: 'warning',
  OTHER: 'default',
};

export default function FeedbackListPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ bouncerFeedback: FeedbackEntry[] }>(BOUNCER_FEEDBACK, {
    fetchPolicy: 'cache-and-network',
  });

  useSupportSocket({ onFeedback: () => refetch() });

  const items = data?.bouncerFeedback ?? [];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Live Feedback
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ratings and feedback submitted by users. Open one to read the full message.
        </Typography>
      </Box>

      {loading && !items.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : !items.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No feedback yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Pod</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Submitted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((fb) => (
              <TableRow
                key={fb.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/feedback/${fb.id}`)}
              >
                <TableCell sx={{ fontWeight: 700 }}>{fb.user.name}</TableCell>
                <TableCell>{fb.pod.title}{fb.pod.venue_name ? ` · ${fb.pod.venue_name}` : ''}</TableCell>
                <TableCell>
                  <Rating value={fb.rating} readOnly size="small" />
                </TableCell>
                <TableCell>
                  <Chip size="small" color={CATEGORY_COLOR[fb.category]} label={fb.category} />
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
