import {
  Avatar,
  Badge,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import type { SupportChatSession } from '../../graphql/supportChat';
import { useTranslation } from '@duncit/shell';

interface Props {
  sessions: SupportChatSession[];
  loading: boolean;
  selectedId: string | null;
  /** Sessions that arrived live over the socket — highlighted until opened. */
  freshIds: Set<string>;
  emptyLabel: string;
  onSelect: (id: string) => void;
}

/** The left-hand "Chat with Us" session list. Unassigned or freshly arrived
 * sessions are tinted + tagged NEW so agents can jump on them instantly. */
export default function SessionList({ sessions, loading, selectedId, freshIds, emptyLabel, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading && !sessions.length) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  if (!sessions.length) {
    return (
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          px: 1.5
        }}>
        {emptyLabel}
      </Typography>
    );
  }
  return (
    <List dense sx={{ py: 0.5, px: 1 }}>
      {sessions.map((s) => (
        <ListItemButton
          key={s.id}
          selected={s.id === selectedId}
          aria-current={s.id === selectedId}
          data-testid={`live-chat-session-row-${s.id}`}
          onClick={() => onSelect(s.id)}
          sx={{
            alignItems: 'center',
            gap: 0.5,
            py: 1,
            mb: 0.5,
            borderRadius: 1,
            borderLeft: 3,
            borderColor: 'transparent',
            ...(s.status !== 'CLOSED' &&
              (freshIds.has(s.id) || !s.agent_id) && {
                borderColor: 'warning.main',
                bgcolor: 'action.hover',
              }),
          }}
        >
          <ListItemAvatar sx={{ minWidth: 48 }}>
            <Badge color="error" badgeContent={s.unread_for_agent} max={9}>
              <Avatar alt="" src={s.user.avatar_url || undefined} sx={{ width: 36, height: 36, fontSize: 14 }}>
                {s.user.name?.[0]?.toUpperCase() || '?'}
              </Avatar>
            </Badge>
          </ListItemAvatar>
          <ListItemText
            primary={s.user.name}
            secondary={s.last_message_preview}
            sx={{ my: 0, minWidth: 0 }}
            slotProps={{
              primary: { variant: 'body2', noWrap: true, sx: { fontWeight: 700 } },
              secondary: { variant: 'caption', noWrap: true, component: 'span', sx: { display: 'block' } }
            }} />
          {s.status === 'CLOSED' && <Chip size="small" variant="outlined" color="success" label={t('support.chat.filterResolved')} sx={{ flexShrink: 0 }} />}
          {s.status !== 'CLOSED' && !s.agent_id && <Chip size="small" color="error" label={t('support.chat.newSession')} sx={{ flexShrink: 0, fontWeight: 700 }} />}
        </ListItemButton>
      ))}
    </List>
  );
}
