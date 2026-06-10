import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Card, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import GroupsIcon from '@mui/icons-material/Groups';
import { clubUrl, podUrl } from '../../utils/seoUrls';
import PodCard from './PodCard';

interface ClubSectionProps {
  club: any;
  clubPods: any[];
  hostNameOf: (pod: any) => string | null;
}

export default function ClubSection({ club, clubPods, hostNameOf }: Readonly<ClubSectionProps>) {
  const navigate = useNavigate();
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ minWidth: 0, cursor: 'pointer' }}
          onClick={() => navigate(clubUrl(club.club_id))}
        >
          <Avatar
            src={club.club_feature_images_and_videos?.[0]?.url}
            variant="rounded"
            sx={{
              width: 46,
              height: 46,
              bgcolor: 'primary.main',
              boxShadow: '0 10px 22px rgba(255,79,115,0.18)',
            }}
          >
            <GroupsIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.15 }} noWrap>
              {club.club_name}
            </Typography>
            {club.club_description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {club.club_description}
              </Typography>
            )}
          </Box>
        </Stack>
        <Chip size="small" label={`${clubPods.length} pods`} sx={{ fontWeight: 800, flex: '0 0 auto' }} />
      </Stack>

      {clubPods.length === 0 ? (
        <Card variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No upcoming pods in this club for the selected city.
          </Typography>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 1.35,
            mx: { xs: -1.25, sm: 0 },
            px: { xs: 1.25, sm: 0 },
            overflowX: 'auto',
            pb: 1.75,
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.16),
              borderRadius: 3,
            },
          }}
        >
          {clubPods.map((p) => (
            <PodCard
              key={p.id}
              pod={p}
              hostName={hostNameOf(p)}
              onOpen={() => navigate(podUrl(p.club_slug, p.pod_id))}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
