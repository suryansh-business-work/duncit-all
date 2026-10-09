import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';
import type { TableFilterValue } from '@duncit/table';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import {
  podsByPhase,
  VENUE_POD_PHASES,
  type VenueCancelPodResult,
  type VenuePodPhase,
} from '@duncit/utils';
import { MY_VENUES } from '../register-venue-page/queries';
import { useRequestPodChange } from '@duncit/pod-change-requests';
import { changeRequestMenuKey } from '@duncit/utils';
import VenuePodsTable from './VenuePodsTable';
import VenuePodDetailDialog from './VenuePodDetailDialog';
import VenueCancelPodDialog from './VenueCancelPodDialog';
import { cancelSuccessMessage, VENUE_PODS, type VenuePodRow } from './queries';
import { useTranslation } from '@duncit/shell';
import { ALL_VENUES, useVenueFilter } from '../../components/venue/useSelectedVenue';

/** Each phase tab's words — the copy mWeb and native render too. */
const PHASE_COPY: Record<VenuePodPhase, { label: string; empty: string }> = {
  UPCOMING: { label: 'mweb.studioOptions.podsUpcoming', empty: 'mweb.studioOptions.noPodsUpcoming' },
  CURRENT: { label: 'mweb.studioOptions.podsCurrent', empty: 'mweb.studioOptions.noPodsCurrent' },
  PAST: { label: 'mweb.studioOptions.podsPast', empty: 'mweb.studioOptions.noPodsPast' },
};

export default function VenuePodsPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<VenuePodRow | null>(null);
  const [podToCancel, setPodToCancel] = useState<VenuePodRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // "Request Change Venue" — the venue owner asking Duncit to move the pod
  // instead of cancelling it. One instance, its dialog rendered once below.
  const change = useRequestPodChange({ onFiled: setMessage });
  const refetchRef = useRef<(() => void) | null>(null);

  const venuesQuery = useQuery<any>(MY_VENUES, { fetchPolicy: 'cache-first' });
  const venues = venuesQuery.data?.myVenues ?? [];
  // Opens on the venue picked last on any venue page; "All my venues" stays a choice.
  const filter = useVenueFilter(venues);
  const podsQuery = useQuery<any>(VENUE_PODS, {
    variables: { venue_id: filter.venueIdOrNull },
    // Wait for the venue list, so the page does not fetch every venue first
    // and then the selected one.
    skip: venuesQuery.loading && !venuesQuery.data,
    fetchPolicy: 'cache-and-network',
  });

  const rows: VenuePodRow[] = useMemo(() => podsQuery.data?.venuePods ?? [], [podsQuery.data]);
  const phases = useMemo(() => podsByPhase(rows), [rows]);

  // Declared after `phases` on purpose: useTabParam reads `items` during the
  // call, so building the labels any earlier dereferences `phases` in its
  // temporal dead zone and the whole page throws on first render.
  const tabItems = useMemo(
    () =>
      VENUE_POD_PHASES.map((phase) => ({
        value: phase,
        label: `${t(PHASE_COPY[phase].label)} (${phases[phase].length})`,
      })),
    [phases, t],
  );
  const tabs = useTabParam<VenuePodPhase>({ items: tabItems, fallback: 'UPCOMING' });
  const tab = tabs.value;

  // DuncitTable does not refetch when its fetchRows changes identity, so a fresh
  // server response must poke its refetch handle.
  useEffect(() => {
    refetchRef.current?.();
  }, [rows]);

  // The phase rides externalFilters — a value change resets to page 1 and
  // re-runs fetchRows without a second data source.
  const externalFilters = useMemo<TableFilterValue[]>(
    () => [{ field: 'phase', op: 'eq', value: tab }],
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
          alignItems: { md: 'center' }
        }}>
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.25}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 800
              }}>
              {t('partners.common.partnerToolsVenues')}
            </Typography>
            <Typography variant="h5" component="h1" sx={{
              fontWeight: 950
            }}>
              {t('mweb.studioOptions.venuePods')}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.studioOptions.venuePodsHint')}
            </Typography>
          </Stack>
          <TextField
            select
            size="small"
            label={t('partners.common.venue')}
            value={filter.value}
            onChange={(event) => filter.change(event.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={ALL_VENUES}>{t('partners.venuePodsPage.allMyVenues')}</MenuItem>
            {venues.map((venue: { id: string; venue_name: string }) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.venue_name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {podsQuery.error && <Alert severity="error">{podsQuery.error.message}</Alert>}

      <DuncitTabs {...tabs} idPrefix="venue-pods" variant="scrollable" allowScrollButtonsMobile />

      <Box {...tabPanelProps('venue-pods', tab)}>
        <VenuePodsTable
          rows={rows}
          externalFilters={externalFilters}
          refetchRef={refetchRef}
          onRowClick={setSelected}
          onCancel={setPodToCancel}
          onRequestChange={(row) =>
            change.open({ podDocId: row.id, role: 'VENUE', attendeeCount: row.attendee_count })
          }
          requestChangeLabel={t(changeRequestMenuKey('VENUE'))}
          emptyText={t(PHASE_COPY[tab].empty)}
        />
      </Box>
      {change.dialog}
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
