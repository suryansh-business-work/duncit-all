import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';

const statusColor = (s: string) => {
  if (s === 'APPROVED') return 'success';
  if (s === 'REJECTED') return 'error';
  if (s === 'SUBMITTED') return 'warning';
  return 'default';
};

interface Props {
  venue: any;
  onReview: (v: any) => void;
}

export default function VenueCard({ venue, onReview }: Readonly<Props>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            {venue.venue_name || '(Unnamed venue)'}
          </Typography>
          <Chip size="small" label={venue.status} color={statusColor(venue.status) as any} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {venue.venue_type} · {[venue.locality, venue.city, venue.state].filter(Boolean).join(', ') || '—'} · cap {venue.capacity}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Step {venue.step_completed}/4 · PIN {venue.postal_code || '—'} · {venue.documents?.length ?? 0} document(s)
        </Typography>
        {venue.tags?.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {venue.tags.map((tag: string) => (
              <Chip key={tag} size="small" label={tag} variant="outlined" />
            ))}
          </Stack>
        )}
        <Typography variant="body2" sx={{ mt: 1 }}>
          Owner: {venue.owner_name} · {venue.owner_email} · {venue.owner_phone}
        </Typography>
        {venue.reviewer_notes && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {venue.reviewer_notes}
          </Alert>
        )}
        <Stack direction="row" spacing={1} mt={2}>
          <Button size="small" variant="outlined" onClick={() => onReview(venue)}>
            Review
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
