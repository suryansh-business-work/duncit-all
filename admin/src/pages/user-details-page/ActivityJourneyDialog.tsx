import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { USER_CLICKSTREAM } from './queries';

interface Props {
  open: boolean;
  userId: string;
  date: string;
  onClose: () => void;
}

function metadataSummary(value: string) {
  try {
    const parsed = JSON.parse(value || '{}');
    return [parsed.source, parsed.pointer, parsed.viewport].filter(Boolean).join(' · ');
  } catch {
    return '';
  }
}

export default function ActivityJourneyDialog({ open, userId, date, onClose }: Props) {
  const { data, loading, error } = useQuery(USER_CLICKSTREAM, {
    variables: { user_id: userId, date, limit: 500 },
    skip: !open || !userId || !date,
    fetchPolicy: 'network-only',
  });
  const events = data?.userClickstream ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>User Journey · {date}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress /></Stack>
        ) : error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : events.length === 0 ? (
          <Alert severity="info">No clickstream events recorded for this day.</Alert>
        ) : (
          <Stack spacing={1.5}>
            {events.map((event: any) => {
              const title = event.target_label || event.target_text || event.title || event.path;
              return (
                <Box key={event.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip size="small" color="success" label={event.event_type} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(event.occurred_at).toLocaleTimeString()}
                    </Typography>
                    {event.super_category_slug && <Chip size="small" variant="outlined" label={event.super_category_slug} />}
                  </Stack>
                  <Typography variant="subtitle2" sx={{ mt: 0.75 }}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary">{event.path}</Typography>
                  {event.target_href && (
                    <Link href={event.target_href} target="_blank" rel="noreferrer" variant="caption">
                      {event.target_href}
                    </Link>
                  )}
                  {metadataSummary(event.metadata_json) && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {metadataSummary(event.metadata_json)}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}