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
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
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
  // Nobody appears twice: a thread already says everything the directory row
  // would, plus what was last said.
  const inThreads = new Set(threads.map((thread) => thread.peer.id));
  const others = coworkers.filter((person) => !inThreads.has(person.id));
  const searching = search.trim().length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Stack spacing={1} sx={{ p: 1.5, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search coworkers"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField select size="small" fullWidth label="Team" value={role} onChange={(e) => onRole(e.target.value)}>
          {ROLE_FILTERS.map((option) => (
            <MenuItem key={option.value || 'all'} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <List dense sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 0 }}>
        {!searching &&
          threads.map((thread) => (
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
                secondary={`${thread.last_from_me ? 'You: ' : ''}${thread.last_text}`}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
            </ListItemButton>
            </ListItem>
          ))}

        {others.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
            {searching || role ? 'Matching coworkers' : 'Everyone else'}
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
              primaryTypographyProps={{ noWrap: true }}
              secondaryTypographyProps={{ component: 'div' }}
            />
          </ListItemButton>
          </ListItem>
        ))}

        {threads.length === 0 && others.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
            Nobody matches that.
          </Typography>
        )}
      </List>
    </Box>
  );
}
