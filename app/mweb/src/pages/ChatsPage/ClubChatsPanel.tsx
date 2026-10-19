import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { formatDateTime } from '../../utils/dateFormat';
import ChatRoomRowShell from './ChatRoomRowShell';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import ChatSearchField from './ChatSearchField';
import type { ClubChatRoomRow, ClubChatRoomsData } from '../chat-room-page/chat.types';

const MY_CLUB_CHAT_ROOMS = gql`
  query MyClubChatRooms {
    myClubChatRooms {
      id
      club_name
      cover_url
      super_category_id
      last_message_at
      last_message_preview
      last_message_type
      unread_count
    }
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
  }
`;

/** The room's last line, in the reader's words: a photo or sticker by name. */
function lastLine(room: ClubChatRoomRow, t: Translate): string {
  if (!room.last_message_at) return t('mweb.chat.noMessagesYet');
  if (room.last_message_type === 'IMAGE') return t('mweb.chat.lastPhoto');
  if (room.last_message_type === 'STICKER') return t('mweb.chat.lastSticker');
  return room.last_message_preview || t('mweb.chat.clubChat');
}

/** The Clubs tab of Chats: one room per club the viewer joined, admins or hosts. */
export default function ClubChatsPanel({ superCategorySlug }: Readonly<{ superCategorySlug?: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<ClubChatRoomsData>(MY_CLUB_CHAT_ROOMS, {
    fetchPolicy: 'cache-and-network',
  });
  const [q, setQ] = useState('');

  const rooms = useMemo(() => {
    const all = data?.myClubChatRooms ?? [];
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((s) => s.slug === superCategorySlug)?.id
      : null;
    return selectedSuperId ? all.filter((r) => r.super_category_id === selectedSuperId) : all;
  }, [data, superCategorySlug]);

  const term = q.trim().toLowerCase();
  const visible = term
    ? rooms.filter((r) => (r.club_name ?? '').toLowerCase().includes(term))
    : rooms;

  if (loading && !data) {
    return (
      <Stack data-testid="club-chats-loading" sx={{ alignItems: 'center', p: 6 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error" data-testid="club-chats-error">{error.message}</Alert>;

  return (
    <Stack spacing={2}>
      <ChatSearchField
        testId="club-chats-search"
        placeholder={t('mweb.chat.searchClubs')}
        value={q}
        onChange={setQ}
      />
      {visible.length === 0 ? (
        <Alert severity="info" role="status" data-testid="club-chats-empty">
          {rooms.length === 0 ? t('mweb.chat.clubsEmpty') : t('mweb.chat.clubsNoMatch')}
        </Alert>
      ) : (
        <Stack spacing={1.75} data-testid="club-chats-list">
          {visible.map((room) => (
            <ChatRoomRowShell
              key={room.id}
              testId={`club-chat-room-${room.id}`}
              coverUrl={room.cover_url}
              fallbackIcon={<GroupsIcon />}
              title={room.club_name}
              unreadCount={room.unread_count}
              onOpen={() => navigate(`/chats/club/${room.id}`)}
            >
              <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                {lastLine(room, t)}
              </Typography>
              {room.last_message_at && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatDateTime(room.last_message_at)}
                </Typography>
              )}
            </ChatRoomRowShell>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
