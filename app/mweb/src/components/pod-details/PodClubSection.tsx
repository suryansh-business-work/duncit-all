import { useState } from 'react';
import { Avatar, Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MomentTile from '../moments/MomentTile';
import MomentLightbox from '../moments/MomentLightbox';

interface Props {
  club: any | null;
}

export default function PodClubSection({ club }: Readonly<Props>) {
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<number | null>(null);
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', flex: 1 }}>
          <Avatar src={cover || undefined} sx={{ width: 48, height: 48 }}>
            {club.club_name?.[0]?.toUpperCase() ?? 'C'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {club.club_name}
            </Typography>
            {club.club_description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {club.club_description}
              </Typography>
            )}
          </Box>
        </Stack>
        <Button
          size="small"
          variant="outlined"
          onClick={() => club.club_id && navigate(`/club/${club.club_id}`)}
          sx={{ minHeight: 36, alignSelf: { xs: 'stretch', sm: 'center' } }}
        >
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
            <Box key={i} sx={{ width: 96, height: 96, flex: '0 0 auto' }}>
              <MomentTile
                url={m.url}
                type={m.type}
                size={96}
                index={i}
                total={moments.length}
                onClick={() => setLightbox(i)}
              />
            </Box>
          ))}
        </Stack>
      )}
      <MomentLightbox
        moments={moments}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </Stack>
  );
}
