import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import { POD_DETAIL } from './queries';
import PodCouponsSection from './PodCouponsSection';
import PodFinanceSection from './PodFinanceSection';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function Row({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function PodDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const showProducts = useFeatureFlag('is_product_visible');
  const { data, loading, error } = useQuery(POD_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const pod = data?.pod;

  if (loading && !pod)
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!pod) return <Alert severity="warning">Pod not found.</Alert>;

  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const isFree = (pod.pod_type ?? '').includes('FREE');
  const attendees = pod.pod_attendees?.length ?? 0;

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/pods')} size="small">
            Pods
          </Button>
          <Typography variant="h5" fontWeight={900} noWrap>
            {pod.pod_title}
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/pods?edit=${pod.id}`)}>
          Edit pod
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={isFree ? 'Free' : `₹${pod.pod_amount}`} color="primary" />
        <Chip label={isVirtual ? 'Virtual' : 'Physical'} variant="outlined" />
        <Chip label={(pod.pod_occurrence ?? '').replace(/_/g, ' ') || 'ONE TIME'} variant="outlined" />
        <Chip label={pod.is_active ? 'Active' : 'Inactive'} color={pod.is_active ? 'success' : 'default'} />
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
            <Divider sx={{ mb: 1 }} />
            <Row label="When" value={`${fmtDateTime(pod.pod_date_time)}`} />
            <Row label="Ends" value={fmtDateTime(pod.pod_end_date_time)} />
            {isVirtual ? (
              <Row label="Meeting" value={pod.meeting_platform || 'Online'} />
            ) : (
              <Row label="Zone" value={pod.zone_name || '—'} />
            )}
            <Row label="People in" value={attendees} />
            <Row label="Spots left" value={Math.max((pod.no_of_spots ?? 0) - attendees, 0)} />
            <Row label="Views" value={pod.pod_hits ?? 0} />
            <Row label="Likes · Comments" value={`${pod.like_count ?? 0} · ${pod.comment_count ?? 0}`} />
            {showProducts && (
              <Row label="Products" value={pod.products_enabled ? 'Enabled' : 'Off'} />
            )}
            {pod.pod_description && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {pod.pod_description}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <PodFinanceSection podId={pod.id} />
          <PodCouponsSection podId={pod.id} podTitle={pod.pod_title} />
        </Stack>
      </Stack>
    </Stack>
  );
}
