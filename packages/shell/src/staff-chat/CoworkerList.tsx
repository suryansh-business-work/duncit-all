import {
  Avatar,
  Badge,
  Box,
  Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '../i18n/useTranslation';
import CoworkerInfoButton from './CoworkerInfoButton';
import PresenceDot from './PresenceDot';
import { ROLE_FILTERS, ROLE_LABEL, type Coworker, type StaffThread } from './queries';
import type { PresenceStatus } from './usePresence';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  role: string;
  onRole: (value: string) => void;
  threads: StaffThread[];
  coworkers: Coworker[];
  /** Live where the socket has said so, seeded from the snapshot otherwise. */
  statusOf: (userId: string) => PresenceStatus;
  onOpen: (peer: Coworker) => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** Their consoles, so you know who you are writing to before you write. */
function RoleChips({ roles }: Readonly<{ roles: string[] }>) {
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
        <Chip key={role} size="small" variant="outlined" label={ROLE_LABEL[role] ?? role} />
      ))}
    </Stack>
  );
}

/**
 * Conversations first, then the directory.
 *
 * The person you messaged an hour ago is far more likely to be the one you
 * want than the first name alphabetically, and a search that has to scroll past
 * everyone you have never spoken to is a search that gets abandoned.
 */
export default function CoworkerList({
  search,
  onSearch,
  role,
  onRole,
  threads,
  coworkers,
  statusOf,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const searching = search.trim().length > 0;

  /*
    The team filter has to reach the CONVERSATIONS too.

    It only ever narrowed the directory, which is the half of this list that
    renders while you are searching — so picking a team left every existing
    thread in place and the filter looked broken. The roles are already on each
    thread's peer, so this needs no second query.
  */
  const shownThreads = searching
    ? []
    : threads.filter((thread) => !role || thread.peer.roles.includes(role));

  // Nobody appears twice: a thread already says everything the directory row
  // would, plus what was last said.
  const inThreads = new Set(shownThreads.map((thread) => thread.peer.id));
  const others = coworkers.filter((person) => !inThreads.has(person.id));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Stack spacing={1} sx={{ p: 1.5, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t('shell.chat.list.searchPlaceholder')}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
        <TextField select size="small" fullWidth label={t('shell.chat.list.team')} value={role} onChange={(e) => onRole(e.target.value)}>
          {ROLE_FILTERS.map((option) => (
            <MenuItem key={option.value || 'all'} value={option.value}>
              {/* The empty option is the only one with copy of its own; the
                  rest are console NAMES, which do not translate. */}
              {option.value ? option.label : t('shell.chat.list.everyone')}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <List
        dense
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', pt: 0 }}
      >
        {shownThreads.map((thread) => (
            <ListItem
              key={thread.peer.id}
              disablePadding
              // secondaryAction, not a button inside the row's button — nesting
              // one interactive element in another breaks both of them.
              secondaryAction={<CoworkerInfoButton person={thread.peer} />}
            >
            <ListItemButton onClick={() => onOpen(thread.peer)}>
              <ListItemAvatar>
                <Badge color="error" badgeContent={thread.unread} overlap="circular">
                  <PresenceDot status={statusOf(thread.peer.id)}>
                    <Avatar src={thread.peer.photo || undefined} sx={{ width: 34, height: 34 }}>
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
          ))}

        {others.length > 0 && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              px: 2,
              py: 1,
              display: 'block'
            }}>
            {searching || role ? t('shell.chat.list.matching') : t('shell.chat.list.everyoneElse')}
          </Typography>
        )}
        {others.map((person) => (
          <ListItem
            key={person.id}
            disablePadding
            secondaryAction={<CoworkerInfoButton person={person} />}
          >
          <ListItemButton onClick={() => onOpen(person)}>
            <ListItemAvatar>
              <PresenceDot status={statusOf(person.id)}>
                <Avatar src={person.photo || undefined} sx={{ width: 34, height: 34 }}>
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
        ))}

        {shownThreads.length === 0 && others.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              px: 2,
              py: 3
            }}>
            {t('shell.chat.list.nobody')}
          </Typography>
        )}
      </List>
    </Box>
  );
}
