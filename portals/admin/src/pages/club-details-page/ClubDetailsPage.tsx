import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import { CLUB_DETAIL } from './queries';

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

export default function ClubDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(CLUB_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const club = data?.club;
  const pods = data?.pods ?? [];

  if (loading && !club)
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!club) return <Alert severity="warning">Club not found.</Alert>;

  const media = club.club_feature_images_and_videos?.length ?? 0;
  const moments = club.club_moments?.length ?? 0;

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/clubs')} size="small">
            Clubs
          </Button>
          <Typography variant="h5" fontWeight={900} noWrap>
            {club.club_name}
          </Typography>
          <Chip
            size="small"
            label={club.is_active ? 'Active' : 'Inactive'}
            color={club.is_active ? 'success' : 'default'}
          />
        </Stack>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/clubs?edit=${club.id}`)}>
          Edit club
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
        <Card sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <GroupsIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={900}>
                Overview
              </Typography>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            {club.club_description && (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>
                {club.club_description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${media} cover media`} />
              <Chip size="small" label={`${moments} moments`} />
              <Chip size="small" label={`${pods.length} pods`} />
            </Stack>
            {club.club_whats_app_community_link && (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                Community:{' '}
                <a href={club.club_whats_app_community_link} target="_blank" rel="noreferrer">
                  {club.club_whats_app_community_link}
                </a>
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <EventIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={900}>
                Pods ({pods.length})
              </Typography>
            </Stack>
            <Divider />
            {pods.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No pods in this club yet.
              </Typography>
            ) : (
              <List dense>
                {pods.map((p: any) => {
                  const price = (p.pod_type ?? '').includes('FREE') ? 'Free' : `₹${p.pod_amount}`;
                  return (
                    <ListItemButton key={p.id} onClick={() => navigate(`/pods/${p.id}`)}>
                      <ListItemText
                        primary={p.pod_title}
                        secondary={`${fmtDate(p.pod_date_time)} · ${price}`}
                      />
                      <Chip
                        size="small"
                        label={p.is_active ? 'Active' : 'Inactive'}
                        color={p.is_active ? 'success' : 'default'}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
