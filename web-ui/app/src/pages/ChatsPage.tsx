import { useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

const CHAT_FEED = gql`
  query ChatFeed {
    me {
      user_id
    }
    pods(filter: { is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_attendees
      no_of_spots
      club_id
      pod_images_and_videos {
        url
        type
      }
    }
    clubs(filter: { is_active: true }) {
      id
      club_name
      club_feature_images_and_videos {
        url
        type
      }
    }
  }
`;

export default function ChatsPage() {
  const { data, loading, error } = useQuery(CHAT_FEED, {
    fetchPolicy: 'cache-and-network',
  });
  const navigate = useNavigate();

  const clubsById = useMemo(() => {
    const m = new Map<string, any>();
    (data?.clubs ?? []).forEach((c: any) => m.set(c.id, c));
    return m;
  }, [data]);

  // Pods I'm attending. Falls back to "upcoming pods" if my id is not in any
  // attendees list (so the page is never empty during early demos).
  const myId = data?.me?.user_id;
  const { mine, upcoming } = useMemo(() => {
    const all = (data?.pods ?? []).slice().sort(
      (a: any, b: any) =>
        new Date(a.pod_date_time || 0).getTime() -
        new Date(b.pod_date_time || 0).getTime(),
    );
    const mine = myId
      ? all.filter((p: any) => (p.pod_attendees ?? []).includes(myId))
      : [];
    return { mine, upcoming: all };
  }, [data, myId]);

  const list = mine.length > 0 ? mine : upcoming;

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
      {mine.length === 0 && (
        <Alert severity="info">
          You haven&apos;t joined any pods yet. Browse upcoming pods below and tap to open the chat.
        </Alert>
      )}
      {list.length === 0 ? (
        <Alert severity="info">No pod conversations yet.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {list.map((p: any) => {
            const club = clubsById.get(p.club_id);
            const avatar =
              p.pod_images_and_videos?.find((m: any) => m.type !== 'VIDEO')?.url ||
              club?.club_feature_images_and_videos?.[0]?.url;
            const attendees = p.pod_attendees?.length ?? 0;
            return (
              <Card key={p.id} variant="outlined">
                <CardActionArea onClick={() => navigate(`/pods/${p.id}`)}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        src={avatar}
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
                          {club && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {club.club_name}
                            </Typography>
                          )}
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
                        </Stack>
                      </Box>
                      <Stack alignItems="center" spacing={0.5}>
                        <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                          {Array.from({ length: Math.min(attendees, 3) }).map((_, i) => (
                            <Avatar key={i} sx={{ bgcolor: 'secondary.main' }}>
                              {i + 1}
                            </Avatar>
                          ))}
                        </AvatarGroup>
                        <Typography variant="caption" color="text.secondary">
                          {attendees}
                          {p.no_of_spots > 0 ? `/${p.no_of_spots}` : ''} attendees
                        </Typography>
                      </Stack>
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
