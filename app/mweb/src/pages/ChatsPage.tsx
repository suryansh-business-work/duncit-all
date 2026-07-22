import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SearchIcon from '@mui/icons-material/Search';
import { isPodActive, podStatus, podStatusChip } from '../utils/podStatus';

type ChatPodFilter = 'ALL' | 'UPCOMING' | 'PREVIOUS';

const POD_FILTERS: Array<[ChatPodFilter, string]> = [
  ['ALL', 'All'],
  ['UPCOMING', 'Upcoming Pods'],
  ['PREVIOUS', 'Previous Pods'],
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
  const { data, loading, error } = useQuery(MY_CHAT_ROOMS, { fetchPolicy: 'cache-and-network' });
  const navigate = useNavigate();
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
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack
      spacing={2}
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        py: 0.5,
        minHeight: '100%',
      }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ChatBubbleOutlineIcon color="primary" />
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Chats
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 700 }}>
          {rooms.length} pod {rooms.length === 1 ? 'chat' : 'chats'} connected right now
        </Typography>
      </Box>
      <TextField
        size="small"
        placeholder="Search chats by pod name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' } }}
      />
      <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {POD_FILTERS.map(([value, label]) => (
          <Chip key={value} clickable label={label} color={filter === value ? 'primary' : 'default'} variant={filter === value ? 'filled' : 'outlined'} onClick={() => setFilter(value)} sx={{ height: 34, fontWeight: 900 }} />
        ))}
      </Stack>
      {filter === 'ALL' && rooms.length > 0 && (
        <Box sx={{ p: 1.5, borderRadius: 4, bgcolor: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.22)' }}>
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 950, letterSpacing: 0.6 }}>
            ACTIVE PODS · {rooms.length}
          </Typography>
          <Stack direction="row" spacing={1.25} sx={{ mt: 1.25, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
            {rooms.slice(0, 10).map((room: any) => (
              <Box key={room.id} sx={{ position: 'relative', flex: '0 0 auto' }} onClick={() => navigate(`/chats/${room.id}`)}>
                <Avatar src={room.cover_url || undefined} sx={{ width: 52, height: 52, bgcolor: 'primary.main', cursor: 'pointer' }}>
                  <GroupsIcon />
                </Avatar>
                <Box sx={{ position: 'absolute', right: 2, bottom: 2, width: 9, height: 9, borderRadius: '50%', bgcolor: 'success.main', border: 2, borderColor: 'background.paper' }} />
              </Box>
            ))}
          </Stack>
        </Box>
      )}
      {visibleRooms.length === 0 ? (
        <Alert severity="info">{emptyMessage}</Alert>
      ) : (
        <Stack spacing={1.25}>
          {visibleRooms.map((p: any) => {
            const statusChip = podStatusChip(podStatus(p.pod_date_time, p.pod_end_date_time));
            return (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 4, bgcolor: 'background.paper', overflow: 'hidden' }}>
              <CardActionArea onClick={() => navigate(`/chats/${p.id}`)}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Avatar src={p.cover_url || undefined} variant="rounded" sx={{ width: 58, height: 58, borderRadius: 3, bgcolor: 'primary.main' }}>
                      <GroupsIcon />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 950, lineHeight: 1.15 }} noWrap>
                        {p.pod_title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }} noWrap display="block">
                        {p.pod_date_time
                          ? new Date(p.pod_date_time).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
                          : 'Pod chat'}
                      </Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }}>
                        <Chip size="small" label={statusChip.label} color={statusChip.color} sx={{ height: 20, fontSize: 10, fontWeight: 950 }} />
                        <Typography variant="caption" color="text.secondary">
                          {p.pod_attendees?.length || 0}{p.no_of_spots ? `/${p.no_of_spots}` : ''} members
                        </Typography>
                      </Stack>
                    </Box>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 900, flex: '0 0 auto' }}>
                      Open
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
