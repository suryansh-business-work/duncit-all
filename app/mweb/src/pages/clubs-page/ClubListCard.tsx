import { Avatar, Box, Button, Card, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';

interface ClubListCardProps {
  club: any;
  podCount: number;
  onOpen: () => void;
}

export default function ClubListCard({ club, podCount, onOpen }: Readonly<ClubListCardProps>) {
  const cover = club.club_feature_images_and_videos?.[0];

  return (
    <Card
      variant="outlined"
      onClick={onOpen}
      sx={{
        cursor: 'pointer',
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        boxShadow: '0 18px 42px rgba(9,7,18,0.18)',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 22px 48px rgba(255,79,115,0.18)' },
      }}
    >
      <Box sx={{ p: 1 }}>
        {cover?.url ? (
          <CardMedia
            component={cover.type === 'VIDEO' ? 'video' : 'img'}
            src={cover.url}
            sx={{ height: 154, borderRadius: 3, objectFit: 'cover' }}
            {...(cover.type === 'VIDEO'
              ? { autoPlay: true, muted: true, loop: true, playsInline: true }
              : { alt: club.club_name })}
          />
        ) : (
          <Box sx={{ height: 154, borderRadius: 3, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #ff8b5f 0%, #ed4f7a 50%, #35158a 100%)' }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}>
              <GroupsIcon />
            </Avatar>
          </Box>
        )}
      </Box>
      <CardContent sx={{ pt: 0.75, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 950, lineHeight: 1.15 }} noWrap>
            {club.club_name}
          </Typography>
          <Chip size="small" label={`${podCount} pods`} color="primary" sx={{ fontWeight: 900 }} />
        </Stack>
        {club.club_description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}
          >
            {club.club_description}
          </Typography>
        )}
        <Button fullWidth variant="contained" endIcon={<ArrowForwardIcon />} onClick={(event) => { event.stopPropagation(); onOpen(); }} sx={{ mt: 1.5, borderRadius: 999, fontWeight: 900 }}>
          Open Club
        </Button>
      </CardContent>
    </Card>
  );
}