import { useNavigate } from 'react-router';
import { Avatar, Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { podStatus, podStatusChip } from '../../utils/podStatus';
import { formatDateTime } from '../../utils/dateFormat';
import { SURFACE_SX } from '../../theme';

interface RowProps {
  room: any;
  onOpen: (id: string) => void;
}

/** One chat room card: cover, pod title, when, status and who is in it. */
function ChatRoomRow({ room, onOpen }: Readonly<RowProps>) {
  const statusChip = podStatusChip(podStatus(room.pod_date_time, room.pod_end_date_time));
  return (
    <ButtonBase
      onClick={() => onOpen(room.id)}
      sx={{
        ...SURFACE_SX,
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
        gap: 1.5,
        p: 1.5,
      }}
    >
      <Avatar
        src={room.cover_url || undefined}
        variant="rounded"
        sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: 'primary.main', flexShrink: 0 }}
      >
        <GroupsIcon />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.25 }} noWrap>
          {room.pod_title}
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
          {room.pod_date_time ? formatDateTime(room.pod_date_time) : 'Pod chat'}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5 }}>
          <Chip size="small" label={statusChip.label} color={statusChip.color} sx={{ height: 20, fontSize: 10 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {/* Identity, deliberately: this counts who is IN the
                chat, and a multi-seat buyer is one person in it.
                Do not seat-adjust it the way occupancy was. */}
            {room.pod_attendees?.length || 0}{room.no_of_spots ? `/${room.no_of_spots}` : ''} members
          </Typography>
        </Stack>
      </Box>
      <ChevronRightRoundedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
    </ButtonBase>
  );
}

/** The chat rooms, one calm card each (native twin: ChatRoomCard in a FeedList). */
export default function ChatRoomList({ rooms }: Readonly<{ rooms: any[] }>) {
  const navigate = useNavigate();
  return (
    <Stack spacing={1.75}>
      {rooms.map((room) => (
        <ChatRoomRow key={room.id} room={room} onOpen={(id) => navigate(`/chats/${id}`)} />
      ))}
    </Stack>
  );
}
