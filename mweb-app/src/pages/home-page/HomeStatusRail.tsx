import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeStatusTile from './HomeStatusTile';
import HomeStatusViewer, { type HomeStatusViewerItem } from './HomeStatusViewer';

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

export default function HomeStatusRail({
  me,
  branding,
  sliders,
  followedClubs,
  followedUsers,
}: HomeStatusRailProps) {
  const navigate = useNavigate();
  const [viewer, setViewer] = useState<HomeStatusViewerItem | null>(null);
  const duncitName = branding?.app_name || 'Duncit';

  return (
    <>
      <Box
        sx={{
          mx: { xs: -1.25, sm: -2 },
          px: { xs: 1.25, sm: 2 },
          pt: 0.25,
          pb: 1,
          mb: 1.25,
          minHeight: 96,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollPaddingInline: 12,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="flex-start" sx={{ width: 'max-content' }}>
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
            onClick={() => {
              const target = slider.effective_link_url ?? slider.link_url ?? '';
              setViewer({
                label: duncitName,
                subLabel: slider.title,
                avatarUrl: branding?.logo_url,
                mediaUrl: slider.media_url,
                mediaType: slider.media_type,
                targetUrl: target,
                internal: slider.link_type === 'INTERNAL' && target.startsWith('/'),
              });
            }}
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
              onClick={() => setViewer({
                label: club.club_name,
                subLabel: 'Club status',
                avatarUrl: firstMedia(club.club_feature_images_and_videos)?.url,
                mediaUrl: media?.url,
                mediaType: media?.type,
                targetUrl: club.club_id ? `/club/${club.club_id}` : undefined,
                internal: true,
              })}
            />
          );
        })}
        {followedUsers.map((user) => (
          <HomeStatusTile
            key={`user-${user.user_id}`}
            label={user.first_name || user.full_name || 'User'}
            imageUrl={user.profile_photo}
            initials={initials(user.full_name || user.first_name)}
            onClick={() => setViewer({
              label: user.first_name || user.full_name || 'User',
              subLabel: user.full_name,
              avatarUrl: user.profile_photo,
              mediaUrl: user.profile_photo,
              mediaType: 'IMAGE',
              targetUrl: `/u/${user.user_id}`,
              internal: true,
            })}
          />
        ))}
        </Stack>
      </Box>
      <HomeStatusViewer item={viewer} onClose={() => setViewer(null)} />
    </>
  );
}