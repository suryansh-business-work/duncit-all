import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Card, CardContent, CircularProgress, InputAdornment, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ENV_ENTRIES, type EnvEntry } from './queries';
import { PORTAL_LIST, type PortalListItem } from './portal-env-queries';
import PortalEnvDrawer from './PortalEnvDrawer';
import PortalMappingTable, { type PortalRow } from './portal-mapping/PortalMappingTable';
import PortalInfoDialog from './portal-mapping/PortalInfoDialog';

/** Assign environment entries to each portal; search, inspect and edit assignments. */
export default function PortalMappingTab() {
  const { data: portalData, loading, refetch } = useQuery<{ portalModes: PortalListItem[] }>(PORTAL_LIST, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: entryData, refetch: refetchEntries } = useQuery<{ envEntries: EnvEntry[] }>(ENV_ENTRIES, {
    variables: { filter: {} },
    fetchPolicy: 'cache-and-network',
  });

  const [search, setSearch] = useState('');
  const [active, setActive] = useState<PortalListItem | null>(null);
  const [info, setInfo] = useState<PortalRow | null>(null);

  const portals = portalData?.portalModes ?? [];
  const entries = entryData?.envEntries ?? [];

  const rows = useMemo<PortalRow[]>(() => {
    const term = search.trim().toLowerCase();
    return portals
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.key.toLowerCase().includes(term))
      .map((portal) => ({
        portal,
        entries: entries.filter((e) => e.assigned_portals.includes(portal.key)),
      }));
  }, [portals, entries, search]);

  const handleSaved = () => {
    refetch();
    refetchEntries();
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Search a portal, view its assigned configs, then assign which environment entries it uses.
      </Typography>
      <TextField
        size="small"
        fullWidth
        placeholder="Search portals by name or key…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 1.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && !portals.length ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={28} /></Box>
          ) : (
            <PortalMappingTable rows={rows} onInfo={setInfo} onAssign={setActive} />
          )}
        </CardContent>
      </Card>

      <PortalInfoDialog row={info} onClose={() => setInfo(null)} />
      <PortalEnvDrawer portal={active} onClose={() => setActive(null)} onSaved={handleSaved} />
    </>
  );
}
