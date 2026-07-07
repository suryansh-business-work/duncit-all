import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Chip, Rating, Stack, Typography } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import GroupsIcon from '@mui/icons-material/Groups';
import type { AdminClub } from './queries';

const firstImage = (club: AdminClub): string | undefined =>
  club.club_feature_images_and_videos.find((media) => media.type === 'IMAGE')?.url;

/** A single "Your Clubs" card linking through to that club's pod management. */
export default function ClubAdminClubCard({ club }: Readonly<{ club: AdminClub }>) {
  const image = firstImage(club);
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardActionArea component={RouterLink} to={`/club-admin/clubs/${club.id}`} sx={{ height: '100%' }}>
        {image ? (
          <Box component="img" src={image} alt={club.club_name} sx={{ width: '100%', height: 140, objectFit: 'cover' }} />
        ) : (
          <Box sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
            <GroupsIcon color="disabled" fontSize="large" />
          </Box>
        )}
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="subtitle1" fontWeight={950} noWrap>{club.club_name}</Typography>
              {club.is_verified && <VerifiedIcon color="primary" fontSize="small" />}
            </Stack>
            {club.locality && <Chip size="small" label={club.locality} variant="outlined" sx={{ alignSelf: 'flex-start' }} />}
            <Stack direction="row" spacing={1} alignItems="center">
              <Rating value={club.rating} precision={0.1} size="small" readOnly />
              <Typography variant="caption" color="text.secondary">({club.ratings_count})</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{club.followers_count} followers</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
