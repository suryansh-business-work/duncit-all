import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Card, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { clubUrl, podUrl } from '../../utils/seoUrls';
import PodCard from './PodCard';

interface ClubSectionProps {
  club: any;
  clubPods: any[];
  hostNameOf: (pod: any) => string | null;
}

export default function ClubSection({ club, clubPods, hostNameOf }: ClubSectionProps) {
  const navigate = useNavigate();
  return (
    <Box>
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
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(clubUrl(club.club_id))}
        >
          <Avatar
            src={club.club_feature_images_and_videos?.[0]?.url}
            variant="rounded"
            sx={{ width: 44, height: 44, bgcolor: 'primary.main' }}
          >
            <GroupsIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
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
        <Chip size="small" label={`${clubPods.length} pods`} />
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
            gap: 2,
            overflowX: 'auto',
            pb: 1.5,
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'action.hover',
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
