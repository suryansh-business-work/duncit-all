import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import MomentTile from '../../components/moments/MomentTile';

interface FollowClubCardProps {
  club: any;
  onOpenMoment: (index: number) => void;
}

export default function FollowClubCard({ club, onOpenMoment }: FollowClubCardProps) {
  const cover = club.club_feature_images_and_videos?.[0]?.url;
  const moments = club.club_moments ?? [];

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        background: (theme) => `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        boxShadow: '0 18px 42px rgba(9,7,18,0.18)',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1.3} alignItems="center" sx={{ mb: 1.25 }}>
          <Avatar
            src={cover || undefined}
            sx={{
              width: 52,
              height: 52,
              bgcolor: 'primary.main',
              border: 2,
              borderColor: 'primary.light',
            }}
          >
            <GroupsIcon />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.12 }} noWrap>
              {club.club_name}
            </Typography>
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 900 }} noWrap>
              {moments.length} moments
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            component={RouterLink}
            to={club.club_id ? `/club/${club.club_id}` : '#'}
            endIcon={<ArrowForwardIcon />}
            sx={{ borderRadius: 999, fontWeight: 900, minWidth: 84 }}
          >
            Open
          </Button>
        </Stack>
        {moments.length === 0 ? (
          <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No moments shared yet.
            </Typography>
          </Box>
        ) : (
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.25, '&::-webkit-scrollbar': { display: 'none' } }}>
            {moments.slice(0, 12).map((moment: any, index: number) => (
              <Box key={`${moment.url}-${index}`} sx={{ width: 86, height: 96, flex: '0 0 auto' }}>
                <MomentTile
                  url={moment.url}
                  type={moment.type}
                  aspect="4 / 5"
                  index={index}
                  total={moments.length}
                  onClick={() => onOpenMoment(index)}
                />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}