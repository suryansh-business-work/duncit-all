import {
  useEffect,
  useState } from 'react';
import { useQuery } from '@apollo/client';
import { useDebouncedValue } from '@duncit/ui';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import {
  Alert,
  Box,
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
import { DuncitButton } from '@duncit/buttons';
import { WA_COMMUNITIES, WA_CONTACTS, WA_GROUPS } from './whatsappQueries';
import { useExtraction } from './extraction';
import GroupMembersDialog, { type GroupRef } from './GroupMembersDialog';
import { useTranslation } from '@duncit/shell';

const TAB_KEYS = ['communities', 'groups', 'users'] as const;
type BrowserTab = (typeof TAB_KEYS)[number];

type Translate = ReturnType<typeof useTranslation>['t'];

const tabConfig = (t: Translate): Record<BrowserTab, { label: string; query: typeof WA_COMMUNITIES; root: string }> => ({
  communities: { label: t('crm.common.communities'), query: WA_COMMUNITIES, root: 'waCommunities' },
  groups: { label: t('crm.common.groups'), query: WA_GROUPS, root: 'waGroups' },
  users: { label: t('crm.tools.users'), query: WA_CONTACTS, root: 'waContacts' },
});

/** Connected-account browser: Communities → Groups → Members, plus all Users.
 * Each tab is server-side searchable + paginated; Extract pulls fresh data. */
export default function WhatsAppBrowser() {
  const { t } = useTranslation();
  const { start: startExtraction, job, setOnDone } = useExtraction();
  const tabs = useTabParam<BrowserTab>({
    items: TAB_KEYS.map((key) => ({ value: key, label: tabConfig(t)[key].label })),
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
  const { data, loading, refetch } = useQuery(tabConfig(t)[tab].query, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    setOnDone(() => refetch());
    return () => setOnDone(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const pageData = (data as Record<string, { items: any[]; total: number }> | undefined)?.[tabConfig(t)[tab].root];
  const items = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const running = job?.status === 'RUNNING';

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1
        }}>
        <DuncitTabs {...tabs} />
        <DuncitButton size="small" variant="contained" startIcon={<BoltIcon />} disabled={running} onClick={() => void startExtraction()}>
          {running ? 'Extracting…' : 'Extract'}
        </DuncitButton>
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder="Search…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        sx={{ mb: 1 }}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }
        }}
      />

      {tab === 'groups' && community && (
        <Chip sx={{ mb: 1 }} label={`Community: ${community.name}`} onDelete={() => setCommunity(null)} />
      )}

      {loading && items.length === 0 ? (
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}><CircularProgress size={24} /></Stack>
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
                  <ListItemText primary={g.name} secondary={t('crm.tools.tapToViewMembers')} />
                </ListItemButton>
              ))}
            {tab === 'users' &&
              items.map((u: any) => (
                <ListItemText key={u.id} primary={u.name || `+${u.phone}`} secondary={`+${u.phone}${u.is_business ? ' · Business' : ''}`} sx={{ px: 2, py: 0.5 }} />
              ))}
            {total === 0 && (
              <Typography
                sx={{
                  color: "text.secondary",
                  px: 2,
                  py: 1
                }}>
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

      {running && <Alert severity="info" sx={{ mt: 1 }}>{t('crm.tools.extractionInProgressDataUpdatesAutomatically')}</Alert>}
      <GroupMembersDialog group={members} onClose={() => setMembers(null)} />
    </Box>
  );
}
