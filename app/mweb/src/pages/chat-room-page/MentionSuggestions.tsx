import { Avatar, ListItemAvatar, ListItemText, MenuItem, MenuList, Paper } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import type { ChatMember } from './chat.types';

interface Props {
  members: ReadonlyArray<ChatMember>;
  onPick: (member: ChatMember) => void;
}

/**
 * The @ list over the composer: members whose name matches what follows `@`.
 * A real menu list, so arrow keys move through it once focused and Enter picks.
 */
export default function MentionSuggestions({ members, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  if (members.length === 0) return null;
  return (
    <Paper
      elevation={0}
      data-testid="chat-mention-suggestions"
      sx={{ mx: { xs: 1.25, sm: 2 }, mb: 0.5, border: 1, borderColor: 'divider', maxHeight: 240, overflowY: 'auto' }}
    >
      <MenuList dense aria-label={t('mweb.chatRoom.mention.suggestions')}>
        {members.map((member) => (
          <MenuItem
            key={member.user_id}
            data-testid={`chat-mention-option-${member.user_id}`}
            onClick={() => onPick(member)}
          >
            <ListItemAvatar sx={{ minWidth: 40 }}>
              <Avatar alt="" src={member.profile_photo || undefined} sx={{ width: 28, height: 28 }}>
                {member.full_name.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={member.full_name} />
          </MenuItem>
        ))}
      </MenuList>
    </Paper>
  );
}
