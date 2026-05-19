import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import HomeStatusTile from './HomeStatusTile';
import HomeStatusViewer, { type HomeStatusViewerItem } from './HomeStatusViewer';
import MyStatusUploadTile from './MyStatusUploadTile';

interface HomeStatusRailProps {
  me?: any;
  branding?: any;
  sliders: any[];
  followedClubs: any[];
  followedPods: any[];
  hostPods: any[];
  followedPosts: any[];
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
  followedPods,
  hostPods,
  followedPosts,
  followedUsers,
}: HomeStatusRailProps) {
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
        <MyStatusUploadTile
          me={me}
          onView={(url) => {
            setViewer({
              label: me?.full_name || me?.first_name || 'My status',
              subLabel: 'Just now',
              avatarUrl: me?.profile_photo,
              mediaUrl: url,
              mediaType: 'IMAGE',
            });
          }}
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
          const moments = (club.club_moments ?? []).filter((item: any) => item?.url);
          const media = firstMedia(moments) ?? firstMedia(club.club_feature_images_and_videos);
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
                slides: moments.map((moment: any, index: number) => ({
                  mediaUrl: moment.url,
                  mediaType: moment.type,
                  subLabel: `Club status ${index + 1}/${moments.length}`,
                })),
                targetUrl: club.club_id ? `/club/${club.club_id}` : undefined,
                internal: true,
              })}
            />
          );
        })}
        {[...hostPods, ...followedPods].map((pod) => {
          const media = firstMedia(pod.pod_images_and_videos);
          return (
            <HomeStatusTile
              key={`pod-${pod.id}`}
              label={pod.pod_title}
              imageUrl={media?.type === 'VIDEO' ? null : media?.url}
              videoUrl={media?.type === 'VIDEO' ? media?.url : null}
              initials={initials(pod.pod_title)}
              onClick={() => setViewer({
                label: pod.pod_title,
                subLabel: hostPods.some((item) => item.id === pod.id) ? 'Your pod status' : 'Followed pod',
                mediaUrl: media?.url,
                mediaType: media?.type,
                slides: (pod.pod_images_and_videos ?? []).map((item: any, index: number) => ({
                  mediaUrl: item.url,
                  mediaType: item.type,
                  subLabel: `Pod status ${index + 1}/${pod.pod_images_and_videos.length}`,
                })),
                targetUrl: pod.club_slug && pod.pod_id ? `/club/${pod.club_slug}/pod/${pod.pod_id}` : undefined,
                internal: true,
              })}
            />
          );
        })}
        {followedUsers.map((user) => (
          (() => {
            const posts = followedPosts.filter((post) => post.author_id === user.user_id);
            const firstPost = posts[0];
            return (
          <HomeStatusTile
            key={`user-${user.user_id}`}
            label={user.first_name || user.full_name || 'User'}
            imageUrl={firstPost?.image_url || user.profile_photo}
            initials={initials(user.full_name || user.first_name)}
            onClick={() => setViewer({
              label: user.first_name || user.full_name || 'User',
              subLabel: user.full_name,
              avatarUrl: user.profile_photo,
              mediaUrl: firstPost?.image_url || user.profile_photo,
              mediaType: 'IMAGE',
              slides: posts.map((post, index) => ({
                mediaUrl: post.image_url,
                mediaType: 'IMAGE',
                subLabel: post.caption || `Status ${index + 1}/${posts.length}`,
              })),
              targetUrl: `/u/${user.user_id}`,
              internal: true,
            })}
          />
            );
          })()
        ))}
        </Stack>
      </Box>
      <HomeStatusViewer item={viewer} onClose={() => setViewer(null)} />
    </>
  );
}