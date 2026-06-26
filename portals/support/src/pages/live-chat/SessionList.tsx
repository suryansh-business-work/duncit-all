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
  if (loading && !sessions.length) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  if (!sessions.length) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ px: 1.5 }}>
        {emptyLabel}
      </Typography>
    );
  }
  return (
    <List dense sx={{ py: 0 }}>
      {sessions.map((s) => (
        <ListItemButton
          key={s.id}
          selected={s.id === selectedId}
          onClick={() => onSelect(s.id)}
          sx={{
            alignItems: 'flex-start',
            ...(s.status !== 'CLOSED' &&
              (freshIds.has(s.id) || !s.agent_id) && {
                bgcolor: 'warning.light',
                '&:hover': { bgcolor: 'warning.light' },
              }),
          }}
        >
          <ListItemAvatar sx={{ minWidth: 40 }}>
            <Badge color="error" badgeContent={s.unread_for_agent} max={9}>
              <Avatar src={s.user.avatar_url || undefined} sx={{ width: 30, height: 30, fontSize: 13 }}>
                {s.user.name?.[0]?.toUpperCase() || '?'}
              </Avatar>
            </Badge>
          </ListItemAvatar>
          <ListItemText
            primary={s.user.name}
            secondary={s.last_message_preview}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
            secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
          />
          {s.status === 'CLOSED' && <Chip size="small" color="success" label="Resolved" sx={{ ml: 0.5, mt: 0.25 }} />}
          {s.status !== 'CLOSED' && !s.agent_id && <Chip size="small" color="error" label="NEW" sx={{ ml: 0.5, mt: 0.25 }} />}
        </ListItemButton>
      ))}
    </List>
  );
}
