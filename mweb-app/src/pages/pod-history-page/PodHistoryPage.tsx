import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { MY_POD_MEMBERSHIPS, type PodHistoryItem } from './queries';
import PodHistoryTimeline from './PodHistoryTimeline';
import { parseApiError } from '../../utils/parseApiError';
import { useDateFormat } from '../../utils/dateFormat';

export default function PodHistoryPage() {
  const { data, loading, error } = useQuery<{ myPodMemberships: PodHistoryItem[] }>(MY_POD_MEMBERSHIPS, {
    fetchPolicy: 'cache-and-network',
  });
  const items = useMemo(() => data?.myPodMemberships ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === (selectedId ?? items[0]?.id)) ?? null;
  const { formatDateTime } = useDateFormat();

  if (loading && items.length === 0) {
    return <Stack alignItems="center" sx={{ p: 6 }}><CircularProgress /></Stack>;
  }

  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;

  if (items.length === 0) {
    return <Alert severity="info">Your pod join and backout history will appear here.</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0 }}>Pods</Typography>
        <Typography variant="h5" fontWeight={900}>Join &amp; Backout History</Typography>
      </Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Stack spacing={1.25} sx={{ flex: 1, width: '100%' }}>
          {items.map((item) => {
            const active = selected?.id === item.id;
            return (
              <Card key={item.id} variant={active ? 'elevation' : 'outlined'}>
                <CardActionArea onClick={() => setSelectedId(item.id)}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar src={item.pod?.pod_images_and_videos?.[0]?.url || undefined}><HistoryIcon /></Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={800} noWrap>{item.pod?.pod_title ?? 'Pod'}</Typography>
                        <Typography variant="caption" color="text.secondary">Joined {formatDateTime(item.joined_at)}</Typography>
                      </Box>
                      <Chip size="small" label={item.status === 'BACKED_OUT' ? 'Backed out' : 'Joined'} color={item.status === 'BACKED_OUT' ? 'warning' : 'success'} />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
        {selected && (
          <Card sx={{ flex: 1, width: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={900}>{selected.pod?.pod_title ?? 'Pod timeline'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selected.pod?.pod_date_time ? formatDateTime(selected.pod.pod_date_time) : 'Timeline'}
              </Typography>
              <PodHistoryTimeline item={selected} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </Stack>
  );
}