import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Card, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';
import type { TableFilterValue, TableQueryState } from '@duncit/table';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { MY_VENUES } from '../register-venue-page/queries';
import VenuePodsTable from './VenuePodsTable';
import VenuePodDetailDialog from './VenuePodDetailDialog';
import VenueCancelPodDialog from './VenueCancelPodDialog';
import {
  applyVenuePodsQuery,
  cancelSuccessMessage,
  tabCounts,
  TAB_LABELS,
  TAB_ORDER,
  VENUE_PODS,
  type VenueCancelPodResult,
  type VenuePodRow,
  type VenuePodTab,
} from './queries';

const ALL_VENUES = 'ALL';

export default function VenuePodsPage() {
  const [venueId, setVenueId] = useState<string>(ALL_VENUES);
  const [selected, setSelected] = useState<VenuePodRow | null>(null);
  const [podToCancel, setPodToCancel] = useState<VenuePodRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);

  const venuesQuery = useQuery(MY_VENUES, { fetchPolicy: 'cache-first' });
  const podsQuery = useQuery(VENUE_PODS, {
    variables: { venue_id: venueId === ALL_VENUES ? null : venueId },
    fetchPolicy: 'cache-and-network',
  });

  const venues = venuesQuery.data?.myVenues ?? [];
  const rows: VenuePodRow[] = useMemo(() => podsQuery.data?.venuePods ?? [], [podsQuery.data]);
  const counts = useMemo(() => tabCounts(rows), [rows]);

  // Declared after `counts` on purpose: useTabParam reads `items` during the
  // call, so building the labels any earlier dereferences `counts` in its
  // temporal dead zone and the whole page throws on first render.
  const tabItems = useMemo(
    () => TAB_ORDER.map((key) => ({ value: key, label: `${TAB_LABELS[key]} (${counts[key]})` })),
    [counts],
  );
  const tabs = useTabParam<VenuePodTab>({ items: tabItems, fallback: 'ALL' });
  const tab = tabs.value;

  // The table reads rows through a ref (fetchRows identity is pinned inside
  // DuncitTable), so a fresh server response must poke its refetch handle.
  const rowsRef = useRef<VenuePodRow[]>(rows);
  rowsRef.current = rows;
  useEffect(() => {
    refetchRef.current?.();
  }, [rows]);

  const fetchRows = useCallback(
    async (q: TableQueryState) => applyVenuePodsQuery(rowsRef.current, q),
    [],
  );

  // Tab selection rides externalFilters — a value change resets to page 1 and
  // re-runs fetchRows without a second data source.
  const externalFilters = useMemo<TableFilterValue[]>(
    () => [{ field: 'tab', op: 'eq', value: tab }],
    [tab],
  );

  // Refetching swaps the `rows` identity, and the effect above pokes the table
  // so the cancelled pod flips to Cancelled without a manual refresh.
  const handleCancelled = async (result: VenueCancelPodResult) => {
    setPodToCancel(null);
    setMessage(cancelSuccessMessage(result));
    await podsQuery.refetch();
  };

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} variant="outlined">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.25}>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>
              Partner tools · Venues
            </Typography>
            <Typography variant="h5" fontWeight={950}>
              Pods
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Every pod booked at your venues — upcoming, completed and cancelled. Click a pod for
              its attendees.
            </Typography>
          </Stack>
          <TextField
            select
            size="small"
            label="Venue"
            value={venueId}
            onChange={(event) => setVenueId(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={ALL_VENUES}>All my venues</MenuItem>
            {venues.map((venue: { id: string; venue_name: string }) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.venue_name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {podsQuery.error && <Alert severity="error">{podsQuery.error.message}</Alert>}

      <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />

      <VenuePodsTable
        fetchRows={fetchRows}
        externalFilters={externalFilters}
        refetchRef={refetchRef}
        onRowClick={setSelected}
        onCancel={setPodToCancel}
      />
      <VenuePodDetailDialog row={selected} onClose={() => setSelected(null)} />
      <VenueCancelPodDialog
        row={podToCancel}
        onClose={() => setPodToCancel(null)}
        onCancelled={handleCancelled}
      />
      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        message={message ?? ''}
        onClose={() => setMessage(null)}
      />
    </Stack>
  );
}
