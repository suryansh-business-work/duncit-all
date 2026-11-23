import { useState } from 'react';
import { Chip, IconButton, ListItem, ListItemButton, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import type { IntelConversation } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { ENV_LABEL_KEYS } from '../../components/sources';
import { relativeTime } from '../../lib/time';

export type RowAction = 'open' | 'rename' | 'pin' | 'archive' | 'delete';

interface Props {
  conversation: IntelConversation;
  onAction: (action: RowAction, conversation: IntelConversation) => void;
}

/** One conversation in the history: title, environment, when — and its actions menu. */
export default function ConversationRow({ conversation: c, onAction }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const act = (action: RowAction) => {
    setAnchor(null);
    onAction(action, c);
  };
  return (
    <ListItem
      disablePadding
      divider
      secondaryAction={
        <IconButton edge="end" aria-label={t('intel.chats.actions', { vars: { title: c.title } })} onClick={(e) => setAnchor(e.currentTarget)}>
          <MoreVertIcon />
        </IconButton>
      }
    >
      <ListItemButton onClick={() => act('open')} sx={{ pr: 7 }}>
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              {c.pinned && <PushPinIcon fontSize="inherit" color="primary" aria-label={t('intel.chats.pinned')} />}
              <Typography variant="body1" noWrap sx={{ fontWeight: 600 }}>
                {c.title}
              </Typography>
            </Stack>
          }
          secondary={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }} component="span">
              <Chip size="small" variant="outlined" label={t(ENV_LABEL_KEYS[c.environment] ?? 'intel.env.STAGING')} component="span" />
              <Typography variant="caption" color="text.secondary" component="span">
                {t('intel.chats.meta', { vars: { count: c.message_count, when: relativeTime(c.last_message_at, t), model: c.model } })}
              </Typography>
            </Stack>
          }
          slotProps={{ secondary: { component: 'span' } }}
        />
      </ListItemButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => act('rename')}>{t('intel.chats.rename.action')}</MenuItem>
        <MenuItem onClick={() => act('pin')}>{c.pinned ? t('intel.chats.unpin') : t('intel.chats.pin')}</MenuItem>
        <MenuItem onClick={() => act('archive')}>{c.archived ? t('intel.chats.restore') : t('intel.chats.archive')}</MenuItem>
        <MenuItem onClick={() => act('delete')} sx={{ color: 'error.main' }}>
          {t('intel.chats.delete')}
        </MenuItem>
      </Menu>
    </ListItem>
  );
}
