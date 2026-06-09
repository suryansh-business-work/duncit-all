import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';

const statusColor = (s: string) =>
  s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : s === 'SUBMITTED' ? 'warning' : 'default';

interface Props {
  host: any;
  onReview: (h: any) => void;
}

export default function HostCard({ host, onReview }: Readonly<Props>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            {host.full_name || '(Unnamed)'}
          </Typography>
          <Chip size="small" label={host.status} color={statusColor(host.status) as any} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {host.email} · {host.phone}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Step {host.step_completed}/4
        </Typography>
        {host.tags?.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {host.tags.map((tag: string) => (
              <Chip key={tag} size="small" label={tag} variant="outlined" />
            ))}
          </Stack>
        )}
        {host.reviewer_notes && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {host.reviewer_notes}
          </Alert>
        )}
        <Stack direction="row" spacing={1} mt={2}>
          <Button size="small" variant="outlined" onClick={() => onReview(host)}>
            Review
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
