import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Alert,
  Avatar,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

const MY_CHAT_ROOMS = gql`
  query MyChatRooms {
    myChatRooms {
      id
      pod_title
      pod_date_time
      pod_attendees
      no_of_spots
      cover_url
      club_id
    }
    clubs(filter: { is_active: true }) {
      id
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

export default function ChatsPage({ superCategorySlug }: ChatsPageProps) {
  const { data, loading, error } = useQuery(MY_CHAT_ROOMS, { fetchPolicy: 'cache-and-network' });
  const navigate = useNavigate();

  const rooms = useMemo(() => {
    const all = data?.myChatRooms ?? [];
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((s: any) => s.slug === superCategorySlug)?.id
      : null;
    if (!selectedSuperId) return all;
    const clubsById = new Map<string, any>();
    (data?.clubs ?? []).forEach((c: any) => clubsById.set(c.id, c));
    return all.filter((r: any) => clubsById.get(r.club_id)?.super_category_id === selectedSuperId);
  }, [data, superCategorySlug]);

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ChatBubbleOutlineIcon />
        <Typography variant="h5" fontWeight={700}>
          Chats
        </Typography>
      </Stack>
      {rooms.length === 0 ? (
        <Alert severity="info">
          You haven't joined any pods yet. Join or host a pod to start chatting with attendees.
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {rooms.map((p: any) => (
            <Card key={p.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/chats/${p.id}`)}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={p.cover_url || undefined}
                      variant="rounded"
                      sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}
                    >
                      <GroupsIcon />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {p.pod_title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        {p.pod_date_time && (
                          <Chip
                            size="small"
                            icon={<EventIcon />}
                            label={new Date(p.pod_date_time).toLocaleString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {p.pod_attendees?.length || 0}
                          {p.no_of_spots ? `/${p.no_of_spots}` : ''} attendees
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
