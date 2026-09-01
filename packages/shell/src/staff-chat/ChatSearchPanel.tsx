import { useState } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { Box, Chip, CircularProgress, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import SearchResultRow from './SearchResultRow';
import { SEARCH_STAFF_MESSAGES, type StaffMessage } from './queries';
import type { ChatFormats } from './useChatSettings';

type Sender = 'ANY' | 'ME' | 'PEER';

interface Props {
  peerId: string;
  meId: string;
  peerName: string;
  formats: ChatFormats;
  /** Ids currently rendered in the thread — the rest cannot be jumped to. */
  loadedIds: Set<string>;
  onJump: (id: string) => void;
  onClose: () => void;
}

/** The end of a day, so "before 5 June" includes the 5th. */
const endOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
};

/**
 * Find something that was said on this line.
 *
 * The filters are the server's, not a second implementation over what happens
 * to be loaded — searching only the last fifty messages is the kind of search
 * that makes people stop trusting search. Which is also why a hit outside the
 * loaded page says so instead of quietly doing nothing when it is clicked.
 */
export default function ChatSearchPanel({
  peerId,
  meId,
  peerName,
  formats,
  loadedIds,
  onJump,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sender, setSender] = useState<Sender>('ANY');
  const [onlyFiles, setOnlyFiles] = useState(false);
  const [onlyLinks, setOnlyLinks] = useState(false);
  const [after, setAfter] = useState<Date | null>(null);
  const [before, setBefore] = useState<Date | null>(null);
  const [run, { data, loading, called }] = useLazyQuery<{ searchStaffMessages: StaffMessage[] }>(
    SEARCH_STAFF_MESSAGES,
    { fetchPolicy: 'network-only' }
  );

  const senderId = { ANY: null, ME: meId, PEER: peerId }[sender];

  const search = () => {
    run({
      variables: {
        peerId,
        filter: {
          text: text.trim() || null,
          from_user_id: senderId,
          after: after ? after.toISOString() : null,
          before: before ? endOfDay(before) : null,
          only_files: onlyFiles,
          only_links: onlyLinks,
        },
      },
    }).catch(() => undefined);
  };

  const results = data?.searchStaffMessages ?? [];

  return (
    <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <TextField
          size="small"
          fullWidth
          autoFocus
          label={t('shell.chat.search.label')}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && search()}
        />
        <Tooltip title={t('shell.chat.header.search')}>
          <DuncitIconButton size="small" onClick={search} aria-label={t('shell.chat.search.run')}>
            <SearchIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('shell.chat.search.close')}>
          <DuncitIconButton size="small" onClick={onClose} aria-label={t('shell.chat.search.close')}>
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          mt: 1
        }}>
        <Chip
          size="small"
          label={t('shell.chat.search.anyone')}
          color={sender === 'ANY' ? 'primary' : 'default'}
          onClick={() => setSender('ANY')}
        />
        <Chip
          size="small"
          label={t('shell.chat.search.fromYou')}
          color={sender === 'ME' ? 'primary' : 'default'}
          onClick={() => setSender('ME')}
        />
        <Chip
          size="small"
          label={t('shell.chat.search.fromPerson', { vars: { name: peerName } })}
          color={sender === 'PEER' ? 'primary' : 'default'}
          onClick={() => setSender('PEER')}
        />
        <Chip
          size="small"
          label={t('shell.chat.search.files')}
          color={onlyFiles ? 'primary' : 'default'}
          onClick={() => setOnlyFiles((value) => !value)}
        />
        <Chip
          size="small"
          label={t('shell.chat.search.links')}
          color={onlyLinks ? 'primary' : 'default'}
          onClick={() => setOnlyLinks((value) => !value)}
        />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <DatePicker
          label={t('shell.chat.search.after')}
          value={after}
          onChange={setAfter}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
        <DatePicker
          label={t('shell.chat.search.before')}
          value={before}
          onChange={setBefore}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
        />
      </Stack>

      <Box sx={{ mt: 1, maxHeight: 220, overflowY: 'auto' }}>
        {loading && <CircularProgress size={18} sx={{ display: 'block', mx: 'auto', my: 2 }} />}

        {!loading && called && results.length === 0 && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('shell.chat.search.nothing')}
          </Typography>
        )}

        {!loading &&
          results.map((message) => (
            <SearchResultRow
              key={message.id}
              message={message}
              who={message.from_user_id === meId ? 'You' : peerName}
              formats={formats}
              loaded={loadedIds.has(message.id)}
              onJump={onJump}
            />
          ))}
      </Box>
    </Box>
  );
}
