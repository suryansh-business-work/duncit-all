import { useNavigate } from 'react-router';
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
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const fmtDate = (iso?: string | null) =>
  iso ? formatDate(iso) : '—';

const priceLabel = (pod: ClubPodRow) =>
  (pod.pod_type ?? '').includes('FREE') ? 'Free' : `₹${pod.pod_amount}`;

/** Right column: the club's pods, each linking to its own detail page. */
export default function ClubPodsCard({ pods }: Readonly<{ pods: ClubPodRow[] }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <EventIcon color="primary" />
          <Typography variant="subtitle1" sx={{
            fontWeight: 900
          }}>
            {t('admin.clubs.pods')}
          </Typography>
          <Chip size="small" label={pods.length} sx={{ ml: 0.5 }} />
        </Stack>
        <Divider />

        {pods.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              pt: 2
            }}>
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
                  slotProps={{
                    primary: { noWrap: true, sx: { fontWeight: 700 } }
                  }}
                />
                <Chip
                  size="small"
                  label={pod.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}
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
