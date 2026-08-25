import { useMemo, useState } from 'react';
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { USER_CLICKSTREAM } from './queries';
import ActivityJourneyChart from './ActivityJourneyChart';
import { formatTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

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

const pageLabel = (event: any) => String(event.title || event.path || 'Untitled page');

export default function ActivityJourneyDialog({ open, userId, date, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pageFilter, setPageFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const { data, loading, error } = useQuery(USER_CLICKSTREAM, {
    variables: { user_id: userId, date, limit: 500 },
    skip: !open || !userId || !date,
    fetchPolicy: 'network-only',
  });
  const events = data?.userClickstream ?? [];
  const pageOptions = useMemo<string[]>(
    () => Array.from(new Set<string>(events.map(pageLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [events]
  );
  const actionOptions = useMemo<string[]>(
    () => Array.from(new Set<string>(events.map((event: any) => String(event.event_type || '')).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [events]
  );
  const visibleEvents = useMemo(
    () => events.filter((event: any) => {
      const matchesPage = !pageFilter || pageLabel(event) === pageFilter;
      const matchesAction = !actionFilter || event.event_type === actionFilter;
      return matchesPage && matchesAction;
    }),
    [actionFilter, events, pageFilter]
  );

  const emptyOrJourney = events.length === 0 ? (
    <Alert severity="info">{t('admin.activity.noClickstream')}</Alert>
  ) : (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField select size="small" label={t('admin.activity.page')} value={pageFilter} onChange={(event) => setPageFilter(event.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="">{t('admin.activity.allPages')}</MenuItem>
          {pageOptions.map((page) => <MenuItem key={page} value={page}>{page}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t('admin.activity.action')} value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">{t('admin.activity.allActions')}</MenuItem>
          {actionOptions.map((action) => <MenuItem key={action} value={action}>{action}</MenuItem>)}
        </TextField>
      </Stack>
      {visibleEvents.length === 0 && <Alert severity="info">{t('admin.activity.noEventsMatch')}</Alert>}
      {visibleEvents.length > 0 && <ActivityJourneyChart events={visibleEvents} />}
      {visibleEvents.map((event: any) => {
        const title = event.target_label || event.target_text || event.title || event.path;
        return (
          <Box key={event.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.25 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <Chip size="small" color="success" label={event.event_type} />
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {formatTime(event.occurred_at)}
              </Typography>
              {event.super_category_slug && <Chip size="small" variant="outlined" label={event.super_category_slug} />}
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 0.75 }}>{title}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>{event.path}</Typography>
            {event.target_href && (
              <Link href={event.target_href} target="_blank" rel="noreferrer" variant="caption">
                {event.target_href}
              </Link>
            )}
            {metadataSummary(event.metadata_json) && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: "block"
                }}>
                {metadataSummary(event.metadata_json)}
              </Typography>
            )}
          </Box>
        );
      })}
    </Stack>
  );
  const errorOrJourney = error ? <Alert severity="error">{error.message}</Alert> : emptyOrJourney;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>User Journey · {date}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack
            sx={{
              alignItems: "center",
              py: 5
            }}><CircularProgress /></Stack>
        ) : (
          errorOrJourney
        )}
      </DialogContent>
    </Dialog>
  );
}