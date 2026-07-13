import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
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
  Tab,
  TablePagination,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import SearchIcon from '@mui/icons-material/Search';
import { WA_COMMUNITIES, WA_CONTACTS, WA_GROUPS } from './whatsappQueries';
import { useExtraction } from './extraction';
import GroupMembersDialog, { type GroupRef } from './GroupMembersDialog';

const QUERIES = [WA_COMMUNITIES, WA_GROUPS, WA_CONTACTS] as const;
const ROOTS = ['waCommunities', 'waGroups', 'waContacts'] as const;

/** Connected-account browser: Communities → Groups → Members, plus all Users.
 * Each tab is server-side searchable + paginated; Extract pulls fresh data. */
export default function WhatsAppBrowser() {
  const { start: startExtraction, job, setOnDone } = useExtraction();
  const [tab, setTab] = useState(0);
  const [community, setCommunity] = useState<GroupRef | null>(null);
  const [members, setMembers] = useState<GroupRef | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset paging/search when switching tabs or drilling into a community.
  useEffect(() => {
    setPage(0);
  }, [tab, community]);

  const input = {
    search: search || null,
    page: page + 1,
    page_size: pageSize,
    ...(tab === 1 && community ? { community_jid: community.jid } : {}),
  };
  const { data, loading, refetch } = useQuery(QUERIES[tab], {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    setOnDone(() => refetch());
    return () => setOnDone(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const pageData = (data as Record<string, { items: any[]; total: number }> | undefined)?.[ROOTS[tab]];
  const items = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const running = job?.status === 'RUNNING';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="Communities" />
          <Tab label="Groups" />
          <Tab label="Users" />
        </Tabs>
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

      {tab === 1 && community && (
        <Chip sx={{ mb: 1 }} label={`Community: ${community.name}`} onDelete={() => setCommunity(null)} />
      )}

      {loading && items.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
      ) : (
        <>
          <List>
            {tab === 0 &&
              items.map((c: any) => (
                <ListItemButton key={c.id} onClick={() => { setCommunity({ jid: c.community_jid, name: c.name }); setTab(1); }}>
                  <ListItemText primary={c.name} secondary={`${c.groups_count} groups`} />
                </ListItemButton>
              ))}
            {tab === 1 &&
              items.map((g: any) => (
                <ListItemButton key={g.id} onClick={() => setMembers({ jid: g.group_jid, name: g.name })}>
                  <ListItemText primary={g.name} secondary="Tap to view members" />
                </ListItemButton>
              ))}
            {tab === 2 &&
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
