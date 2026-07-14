import { useCallback, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Typography } from '@mui/material';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { ENV_ENTRIES, type EnvEntry } from './queries';
import { PORTAL_MODES_TABLE_FOR_ENV, type PortalListItem } from './portal-env-queries';
import PortalEnvDrawer from './PortalEnvDrawer';
import PortalMappingTable, { type PortalRow } from './portal-mapping/PortalMappingTable';
import PortalInfoDialog from './portal-mapping/PortalInfoDialog';

/** Assign environment entries to each portal; search, inspect and edit assignments. */
export default function PortalMappingTab() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [active, setActive] = useState<PortalListItem | null>(null);
  const [info, setInfo] = useState<PortalRow | null>(null);

  // Server-paged portals joined client-side with the (small) env-entry list so
  // each row carries the entries assigned to that portal.
  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const [portalsRes, entriesRes] = await Promise.all([
        client.query({ query: PORTAL_MODES_TABLE_FOR_ENV, variables: tableQueryToGql(q), fetchPolicy: 'network-only' }),
        client.query({ query: ENV_ENTRIES, variables: { filter: {} }, fetchPolicy: 'network-only' }),
      ]);
      const entries = entriesRes.data.envEntries as EnvEntry[];
      const page = portalsRes.data.portalModesTable;
      const rows = (page.rows as PortalListItem[]).map((portal) => ({
        portal,
        entries: entries.filter((e) => e.assigned_portals.includes(portal.key)),
      }));
      return { rows, total: page.total as number };
    },
    [client]
  );

  const handleSaved = () => {
    refetchRef.current?.();
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Search a portal, view its assigned configs, then assign which environment entries it uses.
      </Typography>
      <PortalMappingTable fetchRows={fetchRows} refetchRef={refetchRef} onInfo={setInfo} onAssign={setActive} />

      <PortalInfoDialog row={info} onClose={() => setInfo(null)} />
      <PortalEnvDrawer portal={active} onClose={() => setActive(null)} onSaved={handleSaved} />
    </>
  );
}
