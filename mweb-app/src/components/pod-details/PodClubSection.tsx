import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Props {
  club: any | null;
}

export default function PodClubSection({ club }: Props) {
  const navigate = useNavigate();
  if (!club) {
    return (
      <Typography variant="body2" color="text.secondary">
        Club details unavailable.
      </Typography>
    );
  }

  const cover = club.club_feature_images_and_videos?.[0]?.url;
  const moments: any[] = club.club_moments ?? [];

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={cover || undefined} sx={{ width: 48, height: 48 }}>
          {club.club_name?.[0]?.toUpperCase() ?? 'C'}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {club.club_name}
          </Typography>
          {club.club_description && (
            <Typography variant="caption" color="text.secondary">
              {club.club_description}
            </Typography>
          )}
        </Box>
        <Button size="small" onClick={() => navigate(`/clubs/${club.id}`)}>
          Open
        </Button>
      </Stack>
      {moments.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {moments.slice(0, 12).map((m: any, i: number) => (
            <Box
              key={i}
              component="img"
              src={m.url}
              alt=""
              sx={{
                width: 96,
                height: 96,
                objectFit: 'cover',
                borderRadius: 1.5,
                flex: '0 0 auto',
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
