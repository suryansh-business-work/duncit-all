import { Fragment, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { coverImageUrl } from '@duncit/utils';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Divider,
  InputAdornment,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import {
  MY_POD_MEMBERSHIPS,
  POD_HISTORY_CATEGORIES,
  type PodHistoryCategory,
  type PodHistoryItem,
} from './queries';
import { applyPodHistory, DEFAULT_POD_HISTORY_FILTERS, type PodHistoryFilters } from './podHistoryFilter';
import PodHistoryToolbar from './PodHistoryToolbar';
import { SURFACE_SX } from '../../theme';
import { parseApiError } from '../../utils/parseApiError';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

/** The pill search field over the list. */
const searchSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 48,
    borderRadius: 999,
    bgcolor: 'background.paper',
    '& fieldset': { borderColor: 'var(--duncit-card-border)' },
  },
};

/** One icon on a soft disc and one short line — the page's empty states. */
function EmptyLine({ text }: Readonly<{ text: string }>) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', py: 6, textAlign: 'center' }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
        <HistoryIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
      </Box>
      <Typography sx={{ fontWeight: 600 }}>{text}</Typography>
    </Stack>
  );
}

export default function PodHistoryPage() {
  const { data, loading, error } = useQuery<{ myPodMemberships: PodHistoryItem[] }>(MY_POD_MEMBERSHIPS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: catData } = useQuery<{ categories: PodHistoryCategory[] }>(POD_HISTORY_CATEGORIES, {
    fetchPolicy: 'cache-first',
  });
  const [filters, setFilters] = useState<PodHistoryFilters>(DEFAULT_POD_HISTORY_FILTERS);
  const { formatDateTime } = useDateFormat();
  const { t } = useTranslation();

  const items = useMemo(() => {
    const byPodId = new Map<string, PodHistoryItem>();
    (data?.myPodMemberships ?? []).forEach((item) => {
      const key = item.pod?.id ?? item.pod_id ?? item.id;
      if (!byPodId.has(key)) byPodId.set(key, item);
    });
    return Array.from(byPodId.values());
  }, [data]);

  const categories = catData?.categories ?? [];
  const visible = useMemo(() => applyPodHistory(items, filters, categories), [items, filters, categories]);

  if (loading && items.length === 0) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (items.length === 0) {
    return <EmptyLine text={t('mweb.podHistory.empty')} />;
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography component="h1" sx={{ fontSize: 20, fontWeight: 600, minWidth: 0 }} noWrap>
          {t('mweb.podHistory.title')}
        </Typography>
        <PodHistoryToolbar
          filters={filters}
          categories={categories}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_POD_HISTORY_FILTERS)}
        />
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder={t('mweb.podHistory.searchPlaceholder')}
        value={filters.search}
        onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        sx={searchSx}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },

          htmlInput: { 'aria-label': t('mweb.podHistory.searchAria') }
        }} />

      {visible.length === 0 ? (
        <EmptyLine text={t('mweb.podHistory.noPodsFound')} />
      ) : (
        <Box sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
          {visible.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 && <Divider sx={{ mx: 2 }} />}
              <ListItemButton
                component={RouterLink}
                to={`/pod-history/${item.id}`}
                sx={{ px: 2, py: 1.5, gap: 1.5, borderRadius: 0 }}
              >
                <Avatar
                  variant="rounded"
                  src={coverImageUrl(item.pod?.pod_images_and_videos)}
                  sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'action.hover', color: 'text.secondary' }}
                >
                  <HistoryIcon />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 15, fontWeight: 600 }}>
                    {item.pod?.pod_title ?? t('mweb.podHistory.pod')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('mweb.podHistory.joinedOn', {
                      vars: { date: formatDateTime(item.joined_at) },
                    })}
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
              </ListItemButton>
            </Fragment>
          ))}
        </Box>
      )}
    </Stack>
  );
}
