import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import type { ClubPodRow } from './types';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

const priceLabel = (pod: ClubPodRow) =>
  (pod.pod_type ?? '').includes('FREE') ? 'Free' : `₹${pod.pod_amount}`;

/** Right column: the club's pods, each linking to its own detail page. */
export default function ClubPodsCard({ pods }: Readonly<{ pods: ClubPodRow[] }>) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <EventIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Pods
          </Typography>
          <Chip size="small" label={pods.length} sx={{ ml: 0.5 }} />
        </Stack>
        <Divider />

        {pods.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
            No pods in this club yet.
          </Typography>
        ) : (
          <List dense disablePadding>
            {pods.map((pod) => (
              <ListItemButton
                key={pod.id}
                onClick={() => navigate(`/pods/${pod.id}`)}
                sx={{ borderRadius: 2, my: 0.25 }}
              >
                <ListItemText
                  primary={pod.pod_title}
                  secondary={`${fmtDate(pod.pod_date_time)} · ${priceLabel(pod)}`}
                  primaryTypographyProps={{ fontWeight: 700, noWrap: true }}
                />
                <Chip
                  size="small"
                  label={pod.is_active ? 'Active' : 'Inactive'}
                  color={pod.is_active ? 'success' : 'default'}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
