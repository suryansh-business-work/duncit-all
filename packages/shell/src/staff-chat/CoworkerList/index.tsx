import { Box, InputAdornment, List, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '../../i18n/useTranslation';
import { ROLE_FILTERS, type Coworker, type StaffThread } from '../queries';
import type { PresenceStatus } from '../usePresence';
import { PersonRow, ThreadRow } from './CoworkerRows';

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
            htmlInput: { 'aria-label': t('shell.chat.list.searchPlaceholder'), 'data-testid': 'staff-chat-search' },
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
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <List
        dense
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', pt: 0 }}
      >
        {shownThreads.map((thread) => (
          <ThreadRow
            key={thread.peer.id}
            thread={thread}
            status={statusOf(thread.peer.id)}
            onOpen={onOpen}
          />
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
          <PersonRow key={person.id} person={person} status={statusOf(person.id)} onOpen={onOpen} />
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
