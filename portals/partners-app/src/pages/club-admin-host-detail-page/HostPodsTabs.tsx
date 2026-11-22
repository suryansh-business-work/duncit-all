import { useMemo } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { EM_DASH, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import PodsTable, { type PodRowBase } from '../../components/PodsTable';
import { CLUB_ADMIN_HOST_PODS_TABLE, CLUB_HOST_VENUE_NAMES } from './queries';

type Tab = 'upcoming' | 'past';
const TAB_PREFIX = 'club-host-pods';
/** Which tab is open lives in the URL (?tab=upcoming|past), so a link opens the right one. */
const TAB_URL_PARAM = 'tab';
const LIFECYCLE: Record<Tab, 'UPCOMING' | 'COMPLETED'> = { upcoming: 'UPCOMING', past: 'COMPLETED' };

interface Props {
  clubId: string;
  hostId: string;
}

/**
 * The host's pods in this club, Upcoming and Past. Both tabs ride the club's
 * own pods table (clubAdminPodsTable, club-scoped on the server) pinned to this
 * host and narrowed to one lifecycle bucket, through the same PodsTable the
 * club's pods page renders.
 */
export default function HostPodsTabs({ clubId, hostId }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const venues = useQuery<{ publicVenues: Array<{ id: string; venue_name: string }> }>(CLUB_HOST_VENUE_NAMES, {
    fetchPolicy: 'cache-first',
  });
  const items = useMemo(
    () => [
      { value: 'upcoming' as const, label: t('clubAdmin.hosts.tabUpcoming'), testId: 'club-host-tab-upcoming' },
      { value: 'past' as const, label: t('clubAdmin.hosts.tabPast'), testId: 'club-host-tab-past' },
    ],
    [t],
  );
  const tabs = useTabParam<Tab>({ items, fallback: 'upcoming', param: TAB_URL_PARAM });
  const fetchRows = useApolloTableFetch<PodRowBase>(
    client,
    CLUB_ADMIN_HOST_PODS_TABLE,
    'clubAdminPodsTable',
    {
      extraFilters: [{ field: 'host_user_id', op: 'eq', value: hostId }],
      extraVariables: { club_id: clubId, lifecycle: LIFECYCLE[tabs.value] },
    },
    [clubId, hostId, tabs.value],
  );
  const venueName = (id?: string | null) =>
    venues.data?.publicVenues.find((venue) => venue.id === id)?.venue_name ?? EM_DASH;

  return (
    <Stack spacing={1.5}>
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} aria-label={t('shell.nav.pods')} searchable={false} />
      <Box {...tabPanelProps(TAB_PREFIX, tabs.value)}>
        <PodsTable<PodRowBase>
          key={tabs.value}
          tableId={`partners-club-host-pods-${tabs.value}`}
          fetchRows={fetchRows}
          venueName={venueName}
          emptyText={tabs.value === 'upcoming' ? t('clubAdmin.hosts.noUpcoming') : t('clubAdmin.hosts.noPast')}
        />
      </Box>
    </Stack>
  );
}
