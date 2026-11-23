import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Button, InputAdornment, List, MenuItem, Paper, Skeleton, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '@duncit/app-settings';
import { ConfirmDialog } from '@duncit/dialogs';
import { EmptyState, PageHeader, useDebouncedValue } from '@duncit/ui';
import { fireAndForget } from '@duncit/logs';
import { INTEL_CONVERSATIONS, INTEL_COUNTS, type ConversationsData, type CountsData } from '../../graphql/chat';
import { intelLog } from '../../lib/logger';
import ConversationRow from './ConversationRow';
import { RenameConversationForm } from './rename-conversation';
import { useConversationActions } from './useConversationActions';

const VIEWS = { recent: 'RECENT', pinned: 'PINNED', archived: 'ARCHIVED', all: 'ALL' } as const;
const VIEW_KEYS = { RECENT: 'intel.chats.views.RECENT', PINNED: 'intel.chats.views.PINNED', ARCHIVED: 'intel.chats.views.ARCHIVED', ALL: 'intel.chats.views.ALL' } as const;
const SORTS = ['RECENT', 'TITLE', 'CREATED'] as const;
const SORT_KEYS = { RECENT: 'intel.chats.sort.RECENT', TITLE: 'intel.chats.sort.TITLE', CREATED: 'intel.chats.sort.CREATED' } as const;
const PAGE = 30;

/** Your own chat history: one view per menu entry, searchable, sortable, paged. */
export default function ChatsPage() {
  const { t } = useTranslation();
  const { view: param = 'recent' } = useParams();
  const view = VIEWS[param as keyof typeof VIEWS];
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('RECENT');
  const [pages, setPages] = useState(1);
  const debounced = useDebouncedValue(search, 300);
  const { data, loading, error, refetch } = useQuery<ConversationsData>(INTEL_CONVERSATIONS, {
    variables: { view, sort, search: debounced || null, page: 1, page_size: PAGE * pages },
    skip: !view,
    fetchPolicy: 'cache-and-network',
  });
  const counts = useQuery<CountsData>(INTEL_COUNTS).data?.intelConversationCounts;
  const reload = () => fireAndForget(refetch(), intelLog, '/chats', 'ChatsPage');
  const actions = useConversationActions(reload);
  if (!view) return <Navigate to="/chats/recent" replace />;
  const rows = data?.intelConversations.rows ?? [];
  const total = data?.intelConversations.total ?? 0;
  const countOf = { RECENT: counts?.recent, PINNED: counts?.pinned, ARCHIVED: counts?.archived, ALL: counts?.all }[view];

  return (
    <Stack spacing={2} sx={{ maxWidth: 960 }}>
      <PageHeader title={t(VIEW_KEYS[view])} subtitle={t('intel.chats.subtitle', { vars: { count: countOf ?? 0 } })} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('intel.chats.search')}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': t('intel.chats.search') } }}
        />
        <TextField select size="small" label={t('intel.chats.sortLabel')} value={sort} onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])} sx={{ minWidth: 200 }}>
          {SORTS.map((s) => (
            <MenuItem key={s} value={s}>
              {t(SORT_KEYS[s])}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>{t('intel.common.retry')}</Button>}>{t('intel.chats.loadFailed')}</Alert>}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading && !data && <Box sx={{ p: 2 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Box>}
        {data && rows.length === 0 && <EmptyState title={debounced ? t('intel.chats.noMatches') : t('intel.chats.empty')} />}
        {rows.length > 0 && (
          <List disablePadding aria-label={t(VIEW_KEYS[view])}>
            {rows.map((c) => (
              <ConversationRow key={c.id} conversation={c} onAction={actions.onAction} />
            ))}
          </List>
        )}
      </Paper>
      {rows.length < total && (
        <Box sx={{ textAlign: 'center' }}>
          <Button onClick={() => setPages((p) => p + 1)} disabled={loading}>
            {t('intel.common.loadMore')}
          </Button>
        </Box>
      )}
      <RenameConversationForm open={Boolean(actions.renaming)} title={actions.renaming?.title ?? ''} saving={actions.saving} errorMessage={actions.renameError} onSubmit={(title) => fireAndForget(actions.rename(title), intelLog, '/chats', 'ChatsPage.rename')} onClose={() => actions.setRenaming(null)} />
      <ConfirmDialog open={Boolean(actions.deleting)} title={t('intel.chats.deleteTitle')} message={t('intel.chats.deleteText', { vars: { title: actions.deleting?.title ?? '' } })} destructive busy={actions.removing} confirmLabel={t('intel.chats.delete')} onConfirm={() => fireAndForget(actions.confirmDelete(), intelLog, '/chats', 'ChatsPage.delete')} onClose={() => actions.setDeleting(null)} />
    </Stack>
  );
}
