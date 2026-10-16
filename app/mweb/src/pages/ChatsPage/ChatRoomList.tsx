import { useNavigate } from 'react-router';
import { Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { podStatus, podStatusChip } from '../../utils/podStatus';
import { formatDateTime } from '../../utils/dateFormat';
import ChatRoomRowShell from './ChatRoomRowShell';

interface RowProps {
  room: any;
  onOpen: (id: string) => void;
}

/** One chat room card: cover, pod title, when, status and who is in it. */
function ChatRoomRow({ room, onOpen }: Readonly<RowProps>) {
  const statusChip = podStatusChip(podStatus(room.pod_date_time, room.pod_end_date_time));
  return (
    <ChatRoomRowShell
      testId={`chat-room-${room.id}`}
      coverUrl={room.cover_url}
      fallbackIcon={<GroupsIcon />}
      title={room.pod_title}
      onOpen={() => onOpen(room.id)}
    >
      <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
        {room.pod_date_time ? formatDateTime(room.pod_date_time) : 'Pod chat'}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5 }}>
        <Chip
          size="small"
          data-testid={`chat-room-status-${room.id}`}
          label={statusChip.label}
          color={statusChip.color}
          sx={{ height: 20, fontSize: 10 }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {/* Identity, deliberately: this counts who is IN the
              chat, and a multi-seat buyer is one person in it.
              Do not seat-adjust it the way occupancy was. */}
          {room.pod_attendees?.length || 0}{room.no_of_spots ? `/${room.no_of_spots}` : ''} members
        </Typography>
      </Stack>
    </ChatRoomRowShell>
  );
}

/** The chat rooms, one calm card each (native twin: ChatRoomCard in a FeedList). */
export default function ChatRoomList({ rooms }: Readonly<{ rooms: any[] }>) {
  const navigate = useNavigate();
  return (
    <Stack spacing={1.75} data-testid="chats-list">
      {rooms.map((room) => (
        <ChatRoomRow key={room.id} room={room} onOpen={(id) => navigate(`/chats/${id}`)} />
      ))}
    </Stack>
  );
}
