import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useMemo, useState } from 'react';
import { Alert, Chip, CircularProgress, InputAdornment, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { isPodActive } from '../../utils/podStatus';
import { useTranslation } from '../../i18n/useTranslation';
import SupportShell from '../support-hub/SupportShell';
import ChatRoomList from './ChatRoomList';
import ActivePodsStrip from './ActivePodsStrip';

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

interface ChatsPageProps {
  superCategorySlug?: string;
}

export default function ChatsPage({ superCategorySlug }: Readonly<ChatsPageProps>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MY_CHAT_ROOMS, { fetchPolicy: 'cache-and-network' });
  const [filter, setFilter] = useState<ChatPodFilter>('ALL');
  const [q, setQ] = useState('');

  // Classify by the header's Super Category (For You / For Your Pet), resolving
  // the slug to the club's super_category_id carried on each room.
  const rooms = useMemo(() => {
    const all = data?.myChatRooms ?? [];
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((s: any) => s.slug === superCategorySlug)?.id
      : null;
    if (!selectedSuperId) return all;
    return all.filter((r: any) => r.super_category_id === selectedSuperId);
  }, [data, superCategorySlug]);

  const byStatus = useMemo(() => {
    if (filter === 'ALL') return rooms;
    const wantActive = filter === 'UPCOMING';
    return rooms.filter(
      (r: any) => isPodActive(r.pod_date_time, r.pod_end_date_time) === wantActive
    );
  }, [rooms, filter]);

  const term = q.trim().toLowerCase();
  const visibleRooms = term
    ? byStatus.filter((r: any) => (r.pod_title ?? '').toLowerCase().includes(term))
    : byStatus;

  let emptyMessage = 'No chats match your filters.';
  if (rooms.length === 0) {
    emptyMessage = "You haven't joined any pods yet. Join or host a pod to start chatting with attendees.";
  }

  if (loading && !data)
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <SupportShell title={t('mweb.nav.chats')}>
      <Stack spacing={2}>
        <TextField
          size="small"
          placeholder={t('mweb.chatsPage.searchChatsByPodName')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper', minHeight: 50 },
            '& .MuiOutlinedInput-root fieldset': { borderColor: 'var(--duncit-card-border)' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }
          }}
        />
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
          {POD_FILTERS.map(([value, labelKey]) => {
            const selected = filter === value;
            return (
              <Chip
                key={value}
                clickable
                label={t(labelKey)}
                color={selected ? 'primary' : 'default'}
                onClick={() => setFilter(value)}
                sx={{ height: 36, px: 0.75, flexShrink: 0, ...(selected ? {} : { bgcolor: 'background.paper' }) }}
              />
            );
          })}
        </Stack>
        {filter === 'ALL' && rooms.length > 0 && <ActivePodsStrip rooms={rooms} />}
        {visibleRooms.length === 0 ? (
          <Alert severity="info">{emptyMessage}</Alert>
        ) : (
          <ChatRoomList rooms={visibleRooms} />
        )}
      </Stack>
    </SupportShell>
  );
}
