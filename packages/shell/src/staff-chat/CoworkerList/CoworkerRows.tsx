import {
  Avatar,
  Badge,
  Chip,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
} from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import CoworkerInfoButton from '../CoworkerInfoButton';
import PresenceDot from '../PresenceDot';
import { roleLabel, type Coworker, type StaffThread } from '../queries';
import type { PresenceStatus } from '../usePresence';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** Their consoles, so you know who you are writing to before you write. */
function RoleChips({ roles }: Readonly<{ roles: string[] }>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      sx={{
        flexWrap: "wrap",
        mt: 0.25
      }}>
      {roles.slice(0, 3).map((role) => (
        <Chip key={role} size="small" variant="outlined" label={roleLabel(role, t)} />
      ))}
    </Stack>
  );
}

interface ThreadRowProps {
  thread: StaffThread;
  status: PresenceStatus;
  onOpen: (peer: Coworker) => void;
}

/** A conversation already under way: who, how many unread, and what was last said. */
export function ThreadRow({ thread, status, onOpen }: Readonly<ThreadRowProps>) {
  const { t } = useTranslation();
  return (
    <ListItem
      disablePadding
      // secondaryAction, not a button inside the row's button — nesting
      // one interactive element in another breaks both of them.
      secondaryAction={<CoworkerInfoButton person={thread.peer} />}
    >
      <ListItemButton onClick={() => onOpen(thread.peer)}>
        <ListItemAvatar>
          <Badge color="error" badgeContent={thread.unread} overlap="circular">
            <PresenceDot status={status}>
              <Avatar src={thread.peer.photo || undefined} alt="" sx={{ width: 34, height: 34 }}>
                {initials(thread.peer.name)}
              </Avatar>
            </PresenceDot>
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={thread.peer.name}
          secondary={`${thread.last_from_me ? t('shell.chat.list.you') : ''}${thread.last_text}`}
          slotProps={{
            primary: { noWrap: true },
            secondary: { noWrap: true }
          }} />
      </ListItemButton>
    </ListItem>
  );
}

interface PersonRowProps {
  person: Coworker;
  status: PresenceStatus;
  onOpen: (peer: Coworker) => void;
}

/** Someone from the directory you have not written to yet, with their consoles. */
export function PersonRow({ person, status, onOpen }: Readonly<PersonRowProps>) {
  return (
    <ListItem
      disablePadding
      secondaryAction={<CoworkerInfoButton person={person} />}
    >
      <ListItemButton onClick={() => onOpen(person)}>
        <ListItemAvatar>
          <PresenceDot status={status}>
            <Avatar src={person.photo || undefined} alt="" sx={{ width: 34, height: 34 }}>
              {initials(person.name)}
            </Avatar>
          </PresenceDot>
        </ListItemAvatar>
        <ListItemText
          primary={person.name}
          secondary={<RoleChips roles={person.roles} />}
          slotProps={{
            primary: { noWrap: true },
            secondary: { component: 'div' }
          }} />
      </ListItemButton>
    </ListItem>
  );
}
