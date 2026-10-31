import { useDeferredValue, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { PROMO_STATUS_COLOR, PROMO_STATUS_LABEL } from '../copy';
import { POD_PROMO_CANDIDATES, type PodPromoCandidate } from '../queries';

interface Props {
  selectedId: string | null;
  onPick: (candidate: PodPromoCandidate) => void;
}

/** Upcoming pods, soonest first, searchable by title; a pod already promoted says how far it got. */
export default function PodPicker({ selectedId, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const { data, loading, error } = useQuery<{ podPromoCandidates: PodPromoCandidate[] }>(POD_PROMO_CANDIDATES, {
    variables: { search: deferred || null },
    fetchPolicy: 'cache-and-network',
  });
  const candidates = data?.podPromoCandidates ?? [];

  return (
    <Stack spacing={1} data-testid="pod-picker">
      <TextField
        label={t('marketing.podPromo.searchPods')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        size="small"
        data-testid="pod-picker-search"
      />
      {loading && candidates.length === 0 && <LinearProgress aria-label={t('marketing.podPromo.loadingPods')} />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {!loading && !error && candidates.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('marketing.podPromo.noPods')}
        </Typography>
      )}
      <List dense sx={{ maxHeight: 280, overflowY: 'auto' }} aria-label={t('marketing.podPromo.podList')}>
        {candidates.map((pod) => (
          <ListItemButton key={pod.id} selected={pod.id === selectedId} onClick={() => onPick(pod)} data-testid={`pod-candidate-${pod.id}`}>
            <ListItemText primary={pod.title} secondary={`${formatDateTime(new Date(pod.starts_at))} · ${pod.club_name}`} />
            {pod.promo_status && (
              <StatusChip size="small" status={pod.promo_status} colorMap={PROMO_STATUS_COLOR} label={t(PROMO_STATUS_LABEL[pod.promo_status])} />
            )}
          </ListItemButton>
        ))}
      </List>
    </Stack>
  );
}
