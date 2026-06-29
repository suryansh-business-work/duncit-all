import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PeopleAltIcon from '@mui/icons-material/PeopleAltOutlined';
import PodCard from '../home-page/PodCard';
import FollowButton from '../../components/FollowButton';

interface ClubResult {
  is_following: boolean;
  participant_count: number;
  club: {
    id: string;
    club_id: string;
    club_name: string;
    club_description?: string | null;
    followers_count: number;
    club_feature_images_and_videos?: { url: string }[];
  };
  upcoming_pods: any[];
}

interface Props {
  result: ClubResult;
  categoryName?: string | null;
  following: boolean;
  followBusy: boolean;
  onToggleFollow: (clubId: string) => void;
  onOpenClub: (clubId: string) => void;
  onOpenPod: (clubSlug: string, podSlug: string) => void;
}

const followersLabel = (n: number) => `${n.toLocaleString('en-IN')} follower${n === 1 ? '' : 's'}`;

export default function SearchClubCard({
  result,
  categoryName,
  following,
  followBusy,
  onToggleFollow,
  onOpenClub,
  onOpenPod,
}: Readonly<Props>) {
  const { club, upcoming_pods: pods } = result;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.25 }}>
        <Avatar
          src={club.club_feature_images_and_videos?.[0]?.url}
          variant="rounded"
          onClick={() => onOpenClub(club.club_id)}
          sx={{ width: 52, height: 52, bgcolor: 'primary.main', cursor: 'pointer', flex: '0 0 auto' }}
        >
          <GroupsIcon />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => onOpenClub(club.club_id)}>
          <Typography variant="subtitle1" fontWeight={900} noWrap sx={{ lineHeight: 1.15 }}>
            {club.club_name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            {categoryName && (
              <Typography variant="caption" color="primary.main" fontWeight={800} noWrap>
                {categoryName}
              </Typography>
            )}
            <Stack direction="row" spacing={0.4} alignItems="center">
              <PeopleAltIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700} noWrap>
                {followersLabel(club.followers_count)}
              </Typography>
            </Stack>
          </Stack>
        </Box>
        {following ? (
          <Chip
            size="small"
            icon={<HowToRegIcon />}
            color="primary"
            label="Following"
            sx={{ fontWeight: 800, flex: '0 0 auto' }}
          />
        ) : (
          <FollowButton
            following={false}
            loading={followBusy}
            onToggle={() => onToggleFollow(club.id)}
          />
        )}
      </Stack>

      {pods.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            gap: 1.35,
            overflowX: 'auto',
            pb: 1.25,
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {pods.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              onOpen={() => onOpenPod(pod.club_slug, pod.pod_id)}
            />
          ))}
        </Box>
      ) : (
        club.club_description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {club.club_description}
          </Typography>
        )
      )}
    </Box>
  );
}
