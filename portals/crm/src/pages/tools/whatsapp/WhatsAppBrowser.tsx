import {
  useEffect,
  useState } from 'react';
import { useQuery } from '@apollo/client';
import { useDebouncedValue } from '@duncit/ui';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import SearchIcon from '@mui/icons-material/Search';
import { WA_COMMUNITIES, WA_CONTACTS, WA_GROUPS } from './whatsappQueries';
import { useExtraction } from './extraction';
import GroupMembersDialog, { type GroupRef } from './GroupMembersDialog';

const TAB_KEYS = ['communities', 'groups', 'users'] as const;
type BrowserTab = (typeof TAB_KEYS)[number];

const TAB_CONFIG: Record<BrowserTab, { label: string; query: typeof WA_COMMUNITIES; root: string }> = {
  communities: { label: 'Communities', query: WA_COMMUNITIES, root: 'waCommunities' },
  groups: { label: 'Groups', query: WA_GROUPS, root: 'waGroups' },
  users: { label: 'Users', query: WA_CONTACTS, root: 'waContacts' },
};

/** Connected-account browser: Communities → Groups → Members, plus all Users.
 * Each tab is server-side searchable + paginated; Extract pulls fresh data. */
export default function WhatsAppBrowser() {
  const { start: startExtraction, job, setOnDone } = useExtraction();
  const tabs = useTabParam<BrowserTab>({
    items: TAB_KEYS.map((key) => ({ value: key, label: TAB_CONFIG[key].label })),
    fallback: 'communities',
  });
  const tab = tabs.value;
  const setTab = tabs.onChange;
  const [community, setCommunity] = useState<GroupRef | null>(null);
  const [members, setMembers] = useState<GroupRef | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const search = useDebouncedValue(searchInput.trim(), 350);

  // Reset paging once the debounced search settles (was previously done
  // inside the debounce timeout — equivalent ordering).
  useEffect(() => {
    setPage(0);
  }, [search]);

  // Reset paging/search when switching tabs or drilling into a community.
  useEffect(() => {
    setPage(0);
  }, [tab, community]);

  const input = {
    search: search || null,
    page: page + 1,
    page_size: pageSize,
    ...(tab === 'groups' && community ? { community_jid: community.jid } : {}),
  };
  const { data, loading, refetch } = useQuery(TAB_CONFIG[tab].query, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    setOnDone(() => refetch());
    return () => setOnDone(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const pageData = (data as Record<string, { items: any[]; total: number }> | undefined)?.[TAB_CONFIG[tab].root];
  const items = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const running = job?.status === 'RUNNING';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
        <DuncitTabs {...tabs} />
        <Button size="small" variant="contained" startIcon={<BoltIcon />} disabled={running} onClick={() => void startExtraction()}>
          {running ? 'Extracting…' : 'Extract'}
        </Button>
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder="Search…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        sx={{ mb: 1 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      {tab === 'groups' && community && (
        <Chip sx={{ mb: 1 }} label={`Community: ${community.name}`} onDelete={() => setCommunity(null)} />
      )}

      {loading && items.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
      ) : (
        <>
          <List>
            {tab === 'communities' &&
              items.map((c: any) => (
                <ListItemButton key={c.id} onClick={() => { setCommunity({ jid: c.community_jid, name: c.name }); setTab('groups'); }}>
                  <ListItemText primary={c.name} secondary={`${c.groups_count} groups`} />
                </ListItemButton>
              ))}
            {tab === 'groups' &&
              items.map((g: any) => (
                <ListItemButton key={g.id} onClick={() => setMembers({ jid: g.group_jid, name: g.name })}>
                  <ListItemText primary={g.name} secondary="Tap to view members" />
                </ListItemButton>
              ))}
            {tab === 'users' &&
              items.map((u: any) => (
                <ListItemText key={u.id} primary={u.name || `+${u.phone}`} secondary={`+${u.phone}${u.is_business ? ' · Business' : ''}`} sx={{ px: 2, py: 0.5 }} />
              ))}
            {total === 0 && (
              <Typography color="text.secondary" sx={{ px: 2, py: 1 }}>
                {running ? 'Extracting from WhatsApp…' : 'No data yet. Tap Extract to pull from WhatsApp.'}
              </Typography>
            )}
          </List>
          {total > 0 && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(Number.parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          )}
        </>
      )}

      {running && <Alert severity="info" sx={{ mt: 1 }}>Extraction in progress — data updates automatically.</Alert>}
      <GroupMembersDialog group={members} onClose={() => setMembers(null)} />
    </Box>
  );
}
