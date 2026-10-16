import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useMemo, useState } from 'react';
import { Alert, Chip, CircularProgress, Stack } from '@mui/material';
import { isPodActive } from '../../utils/podStatus';
import { useTranslation } from '../../i18n/useTranslation';
import ChatRoomList from './ChatRoomList';
import ActivePodsStrip from './ActivePodsStrip';
import ChatSearchField from './ChatSearchField';
import type { PodChatRoomsData } from '../chat-room-page/chat.types';

type ChatPodFilter = 'ALL' | 'UPCOMING' | 'PREVIOUS';

const POD_FILTERS: Array<[ChatPodFilter, string]> = [
  ['ALL', 'mweb.common.all'],
  ['UPCOMING', 'mweb.chat.upcomingPods'],
  ['PREVIOUS', 'mweb.chat.previousPods'],
];

const MY_CHAT_ROOMS = gql`
  query MyChatRooms {
    myChatRooms {
      id
      pod_title
      pod_date_time
      pod_end_date_time
      pod_attendees
      no_of_spots
      cover_url
      club_id
      super_category_id
    }
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
  }
`;

/** The Pods tab of Chats: every pod room the viewer hosts or attends. */
export default function PodChatsPanel({ superCategorySlug }: Readonly<{ superCategorySlug?: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<PodChatRoomsData>(MY_CHAT_ROOMS, { fetchPolicy: 'cache-and-network' });
  const [filter, setFilter] = useState<ChatPodFilter>('ALL');
  const [q, setQ] = useState('');

  // Classify by the header's Super Category (For You / For Your Pet), resolving
  // the slug to the club's super_category_id carried on each room.
  const rooms = useMemo(() => {
    const all = data?.myChatRooms ?? [];
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((s) => s.slug === superCategorySlug)?.id
      : null;
    if (!selectedSuperId) return all;
    return all.filter((r) => r.super_category_id === selectedSuperId);
  }, [data, superCategorySlug]);

  const byStatus = useMemo(() => {
    if (filter === 'ALL') return rooms;
    const wantActive = filter === 'UPCOMING';
    return rooms.filter(
      (r) => isPodActive(r.pod_date_time, r.pod_end_date_time) === wantActive
    );
  }, [rooms, filter]);

  const term = q.trim().toLowerCase();
  const visibleRooms = term
    ? byStatus.filter((r) => (r.pod_title ?? '').toLowerCase().includes(term))
    : byStatus;

  const emptyMessage =
    rooms.length === 0 ? t('mweb.chat.podsEmpty') : t('mweb.chat.podsNoMatch');

  if (loading && !data)
    return (
      <Stack data-testid="chats-loading" sx={{ alignItems: 'center', p: 6 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  if (error) return <Alert severity="error" data-testid="chats-error">{error.message}</Alert>;

  return (
    <Stack spacing={2}>
      <ChatSearchField
        testId="chats-search"
        placeholder={t('mweb.chatsPage.searchChatsByPodName')}
        value={q}
        onChange={setQ}
      />
      <Stack data-testid="chat-pod-filter" direction="row" spacing={1} sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {POD_FILTERS.map(([value, labelKey]) => {
          const selected = filter === value;
          return (
            <Chip
              key={value}
              data-testid={`chat-filter-${value}`}
              clickable
              label={t(labelKey)}
              color={selected ? 'primary' : 'default'}
              onClick={() => setFilter(value)}
              aria-pressed={selected}
              sx={{ height: 36, px: 0.75, flexShrink: 0, ...(selected ? {} : { bgcolor: 'background.paper' }) }}
            />
          );
        })}
      </Stack>
      {filter === 'ALL' && rooms.length > 0 && <ActivePodsStrip rooms={rooms} />}
      {visibleRooms.length === 0 ? (
        <Alert severity="info" role="status" data-testid="chats-empty">{emptyMessage}</Alert>
      ) : (
        <ChatRoomList rooms={visibleRooms} />
      )}
    </Stack>
  );
}
