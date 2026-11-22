import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Divider, Drawer, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { roleLabelKey } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import { notifyError } from '../../components/notify';
import { ASK_DUNCIT_CONVERSATIONS, ASK_DUNCIT_MEMORY, DELETE_ASK_DUNCIT_CONVERSATION, FORGET_ASK_DUNCIT_FACT, type ConversationItem } from './queries';

interface Props {
  open: boolean;
  activeId: string | null;
  showMemory: boolean;
  onClose: () => void;
}

/** Chat history (search, open, delete) and what Ask Duncit remembers about the person. */
export default function HistoryDrawer({ open, activeId, showMemory, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { formatDateTime } = useDateFormat();
  const [search, setSearch] = useState('');
  const list = useQuery<{ askDuncitConversations: { items: ConversationItem[]; has_more: boolean } }>(ASK_DUNCIT_CONVERSATIONS, {
    variables: { search: search.trim() || null },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const memory = useQuery<{ askDuncitMemory: Array<{ id: string; text: string }> }>(ASK_DUNCIT_MEMORY, { skip: !open || !showMemory, fetchPolicy: 'cache-and-network' });
  const [remove] = useMutation(DELETE_ASK_DUNCIT_CONVERSATION);
  const [forget] = useMutation(FORGET_ASK_DUNCIT_FACT);
  const items = list.data?.askDuncitConversations.items ?? [];
  const page = list.data?.askDuncitConversations;

  const openConversation = (id: string) => {
    navigate(`/ask-duncit/${id}`);
    onClose();
  };

  const onDelete = async (item: ConversationItem) => {
    const ok = await confirm({ title: t('askDuncit.history.deleteTitle'), message: item.title, confirmLabel: t('askDuncit.history.delete'), destructive: true });
    if (!ok) return;
    try {
      await remove({ variables: { id: item.id } });
      await list.refetch();
      if (item.id === activeId) navigate('/ask-duncit');
    } catch {
      notifyError(t('askDuncit.errors.INTERNAL'));
    }
  };

  const loadMore = () => {
    const last = items[items.length - 1];
    if (!last?.last_message_at) return;
    list
      .fetchMore({
        variables: { before: last.last_message_at },
        updateQuery: (prev, { fetchMoreResult }) => ({
          askDuncitConversations: {
            items: [...prev.askDuncitConversations.items, ...fetchMoreResult.askDuncitConversations.items],
            has_more: fetchMoreResult.askDuncitConversations.has_more,
          },
        }),
      })
      .catch(() => notifyError(t('askDuncit.errors.INTERNAL')));
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 380 } } } }}>
      <Stack direction="row" sx={{ alignItems: 'center', p: 1.5 }}>
        <Typography variant="h6" component="h2" sx={{ flex: 1, fontWeight: 700 }}>
          {t('askDuncit.history.title')}
        </Typography>
        <DuncitIconButton aria-label={t('askDuncit.close')} onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <Box sx={{ px: 1.5, pb: 1 }}>
        <TextField fullWidth size="small" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('askDuncit.history.search')} slotProps={{ htmlInput: { 'aria-label': t('askDuncit.history.search') } }} />
      </Box>
      {list.loading && !items.length && <CircularProgress size={20} sx={{ mx: 'auto', my: 2 }} aria-label={t('askDuncit.loading')} />}
      {!list.loading && !items.length && (
        <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, py: 1 }}>
          {t('askDuncit.history.empty')}
        </Typography>
      )}
      <List dense sx={{ flex: 1, overflowY: 'auto' }}>
        {items.map((item) => (
          <ListItemButton key={item.id} selected={item.id === activeId} onClick={() => openConversation(item.id)}>
            <ListItemText
              primary={item.title || t('askDuncit.history.untitled')}
              secondary={`${t(roleLabelKey(item.role_key))}${item.last_message_at ? ` · ${formatDateTime(item.last_message_at)}` : ''}`}
              slotProps={{ primary: { noWrap: true } }}
            />
            <DuncitIconButton edge="end" aria-label={t('askDuncit.history.delete')} onClick={(e) => { e.stopPropagation(); onDelete(item).catch(() => undefined); }}>
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </ListItemButton>
        ))}
        {page?.has_more && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <DuncitButton size="small" onClick={loadMore}>
              {t('askDuncit.history.more')}
            </DuncitButton>
          </Box>
        )}
      </List>
      {showMemory && (
        <>
          <Divider />
          <Box sx={{ p: 1.5, maxHeight: 220, overflowY: 'auto' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {t('askDuncit.memory.title')}
            </Typography>
            {(memory.data?.askDuncitMemory ?? []).length === 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('askDuncit.memory.empty')}
              </Typography>
            )}
            {(memory.data?.askDuncitMemory ?? []).map((fact) => (
              <Stack key={fact.id} direction="row" sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {fact.text}
                </Typography>
                <DuncitIconButton size="small" aria-label={t('askDuncit.memory.forget')} onClick={() => { forget({ variables: { id: fact.id } }).then(() => memory.refetch()).catch(() => notifyError(t('askDuncit.errors.INTERNAL'))); }}>
                  <DeleteOutlineIcon fontSize="small" />
                </DuncitIconButton>
              </Stack>
            ))}
          </Box>
        </>
      )}
    </Drawer>
  );
}
