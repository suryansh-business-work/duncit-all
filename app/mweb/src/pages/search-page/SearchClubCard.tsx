import { Avatar, Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import { coverImageUrl } from '@duncit/utils';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PeopleAltIcon from '@mui/icons-material/PeopleAltOutlined';
import PodCard from '../home-page/PodCard';
import FollowButton from '../../components/FollowButton';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  const { club, upcoming_pods: pods } = result;
  return (
    <Stack data-testid={`search-club-card-${club.id}`} spacing={1.5} sx={{ ...SURFACE_SX, p: 2, minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center"
        }}>
        {/* Cover and name are ONE keyboard-reachable control (2.1.1) — the
            native twin's PressScale. */}
        <ButtonBase
          data-testid={`search-club-card-${club.id}-open`}
          onClick={() => onOpenClub(club.club_id)}
          sx={{ flex: 1, minWidth: 0, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left', borderRadius: '12px' }}
        >
          <Avatar
            data-testid={`search-club-card-${club.id}-avatar`}
            alt=""
            src={coverImageUrl(club.club_feature_images_and_videos)}
            variant="rounded"
            sx={{ width: 52, height: 52, borderRadius: '12px', bgcolor: 'action.hover', color: 'secondary.main', flex: '0 0 auto' }}
          >
            <GroupsIcon />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              noWrap
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                lineHeight: 1.2
              }}>
              {club.club_name}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: 'wrap',
                color: 'text.secondary'
              }}>
              {categoryName && (
                <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
                  {categoryName}
                </Typography>
              )}
              <Stack direction="row" spacing={0.4} sx={{
                alignItems: "center"
              }}>
                <PeopleAltIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
                  {followersLabel(club.followers_count)}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </ButtonBase>
        {following ? (
          <Chip
            data-testid={`search-club-card-${club.id}-following`}
            icon={<CheckRoundedIcon />}
            label={t('mweb.nav.following')}
            sx={{ fontWeight: 600, flex: '0 0 auto', '& .MuiChip-icon': { color: 'text.primary' } }}
          />
        ) : (
          <FollowButton
            status="NONE"
            loading={followBusy}
            targetName={club.club_name}
            onToggle={() => onToggleFollow(club.id)}
          />
        )}
      </Stack>

      {pods.length > 0 ? (
        <Box
          data-testid={`search-club-card-${club.id}-pods`}
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 0.5,
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
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
            {club.club_description}
          </Typography>
        )
      )}
    </Stack>
  );
}
