import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HistoryIcon from '@mui/icons-material/History';
import {
  MY_POD_MEMBERSHIPS,
  POD_HISTORY_CATEGORIES,
  type PodHistoryCategory,
  type PodHistoryItem,
} from './queries';
import { applyPodHistory, DEFAULT_POD_HISTORY_FILTERS, type PodHistoryFilters } from './podHistoryFilter';
import PodHistoryToolbar from './PodHistoryToolbar';
import { parseApiError } from '../../utils/parseApiError';
import { useDateFormat } from '../../utils/dateFormat';

export default function PodHistoryPage() {
  const { data, loading, error } = useQuery<{ myPodMemberships: PodHistoryItem[] }>(MY_POD_MEMBERSHIPS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: catData } = useQuery<{ categories: PodHistoryCategory[] }>(POD_HISTORY_CATEGORIES, {
    fetchPolicy: 'cache-first',
  });
  const [filters, setFilters] = useState<PodHistoryFilters>(DEFAULT_POD_HISTORY_FILTERS);
  const { formatDateTime } = useDateFormat();

  const items = useMemo(() => {
    const byPodId = new Map<string, PodHistoryItem>();
    (data?.myPodMemberships ?? []).forEach((item) => {
      const key = item.pod?.id ?? item.pod_id ?? item.id;
      if (!byPodId.has(key)) byPodId.set(key, item);
    });
    return Array.from(byPodId.values());
  }, [data]);

  const visible = useMemo(() => applyPodHistory(items, filters), [items, filters]);

  if (loading && items.length === 0) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (items.length === 0) {
    return <Alert severity="info">Pods you have joined will appear here.</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0 }}>
            Pods
          </Typography>
          <Typography variant="h5" fontWeight={900}>
            Joined Pods
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tap any pod you joined to view details, actions, refund status, and timeline.
          </Typography>
        </Box>
        <PodHistoryToolbar
          filters={filters}
          categories={catData?.categories ?? []}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_POD_HISTORY_FILTERS)}
        />
      </Stack>

      {visible.length === 0 ? (
        <Alert severity="info" icon={false}>
          <Typography fontWeight={900}>No Pods Found</Typography>
          <Typography variant="body2">
            We couldn't find any enrolled Pods matching your selected filters. Try changing your filters to explore more
            of your Pod history.
          </Typography>
        </Alert>
      ) : (
        <Stack spacing={1.25}>
          {visible.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardActionArea component={RouterLink} to={`/pod-history/${item.id}`}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={item.pod?.pod_images_and_videos?.[0]?.url || undefined}>
                      <HistoryIcon />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={900} noWrap>
                        {item.pod?.pod_title ?? 'Pod'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Joined {formatDateTime(item.joined_at)}
                      </Typography>
                    </Box>
                    <ArrowForwardIcon color="action" fontSize="small" />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
