import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';

const ALL_CLUBS = gql`
  query AllClubs {
    clubs(filter: { is_active: true }) {
      id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
    }
    pods(filter: { is_active: true }) {
      id
      club_id
    }
  }
`;

export default function ClubsPage() {
  const { data, loading, error } = useQuery(ALL_CLUBS, {
    fetchPolicy: 'cache-and-network',
  });
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const podCounts = useMemo(() => {
    const m = new Map<string, number>();
    (data?.pods ?? []).forEach((p: any) =>
      m.set(p.club_id, (m.get(p.club_id) ?? 0) + 1),
    );
    return m;
  }, [data]);

  const clubs = useMemo(() => {
    const list = (data?.clubs ?? []).slice();
    const term = q.trim().toLowerCase();
    return list
      .filter(
        (c: any) =>
          !term ||
          c.club_name?.toLowerCase().includes(term) ||
          c.club_description?.toLowerCase().includes(term),
      )
      .sort((a: any, b: any) => a.club_name.localeCompare(b.club_name));
  }, [data, q]);

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        All Clubs
      </Typography>
      <TextField
        size="small"
        placeholder="Search clubs"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      {clubs.length === 0 ? (
        <Alert severity="info">No clubs found.</Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {clubs.map((c: any) => {
            const cover = c.club_feature_images_and_videos?.[0];
            const count = podCounts.get(c.id) ?? 0;
            return (
              <Card key={c.id} variant="outlined">
                <CardActionArea onClick={() => navigate(`/clubs/${c.id}`)}>
                  {cover?.url ? (
                    <CardMedia
                      component={cover.type === 'VIDEO' ? 'video' : 'img'}
                      src={cover.url}
                      sx={{ height: 140, objectFit: 'cover' }}
                      {...(cover.type === 'VIDEO'
                        ? { autoPlay: true, muted: true, loop: true, playsInline: true }
                        : { alt: c.club_name })}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 140,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <GroupsIcon />
                      </Avatar>
                    </Box>
                  )}
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.25 }}>
                        {c.club_name}
                      </Typography>
                      <Chip size="small" label={`${count} pods`} />
                    </Stack>
                    {c.club_description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mt: 0.5,
                        }}
                      >
                        {c.club_description}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
