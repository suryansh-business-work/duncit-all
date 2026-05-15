import { Box, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeStatusTile from './HomeStatusTile';

interface HomeStatusRailProps {
  me?: any;
  branding?: any;
  sliders: any[];
  followedClubs: any[];
  followedUsers: any[];
}

function initials(name?: string | null) {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function firstMedia(items?: Array<{ url?: string | null; type?: string | null }>) {
  return (items ?? []).find((item) => !!item?.url) ?? null;
}

function openSlider(slider: any, navigate: (to: string) => void) {
  const target: string = slider.effective_link_url ?? slider.link_url ?? '';
  if (!target) return;
  if (slider.link_type === 'INTERNAL' && target.startsWith('/')) {
    navigate(target);
    return;
  }
  window.open(target, '_blank', 'noreferrer');
}

export default function HomeStatusRail({
  me,
  branding,
  sliders,
  followedClubs,
  followedUsers,
}: HomeStatusRailProps) {
  const navigate = useNavigate();
  const duncitName = branding?.app_name || 'Duncit';

  return (
    <Box
      sx={{
        mx: { xs: -1.25, sm: -2 },
        px: { xs: 1.25, sm: 2 },
        pb: 1.25,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack direction="row" spacing={1.35} alignItems="flex-start">
        <HomeStatusTile
          label="My status"
          imageUrl={me?.profile_photo}
          initials={initials(me?.full_name || me?.first_name)}
          add
          onClick={() => navigate('/profile?newPost=1')}
        />
        {sliders.map((slider) => (
          <HomeStatusTile
            key={`slider-${slider.id}`}
            label={duncitName}
            imageUrl={slider.media_type === 'VIDEO' ? null : slider.media_url}
            videoUrl={slider.media_type === 'VIDEO' ? slider.media_url : null}
            initials={initials(duncitName)}
            onClick={() => openSlider(slider, navigate)}
          />
        ))}
        {followedClubs.map((club) => {
          const media = firstMedia(club.club_moments) ?? firstMedia(club.club_feature_images_and_videos);
          return (
            <HomeStatusTile
              key={`club-${club.id}`}
              label={club.club_name}
              imageUrl={media?.type === 'VIDEO' ? null : media?.url}
              videoUrl={media?.type === 'VIDEO' ? media?.url : null}
              initials={initials(club.club_name)}
              onClick={() => club.club_id && navigate(`/club/${club.club_id}`)}
            />
          );
        })}
        {followedUsers.map((user) => (
          <HomeStatusTile
            key={`user-${user.user_id}`}
            label={user.first_name || user.full_name || 'User'}
            imageUrl={user.profile_photo}
            initials={initials(user.full_name || user.first_name)}
            onClick={() => navigate(`/u/${user.user_id}`)}
          />
        ))}
      </Stack>
    </Box>
  );
}