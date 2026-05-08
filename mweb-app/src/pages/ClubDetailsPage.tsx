import { gql, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CampaignIcon from '@mui/icons-material/Campaign';
import ChatIcon from '@mui/icons-material/Chat';
import { useFollowedClubs } from '../hooks/useFollowedClubs';
import { notify } from '../components/notify';
import { usePricing } from '../hooks/usePricing';
import MomentTile from '../components/moments/MomentTile';
import MomentLightbox from '../components/moments/MomentLightbox';
import ClubHero from './club-details-page/ClubHero';

const CLUB_DETAILS = gql`
  query ClubDetails($id: ID!) {
    club(club_doc_id: $id) {
      id
      club_id
      club_name
      club_description
      club_feature_images_and_videos {
        url
        type
      }
      club_moments {
        url
        type
      }
      club_whats_app_community_link
      club_whats_app_announcement_link
      club_whats_app_group_link
      meetup_venues_id
      category_id
      super_category_id
    }
    clubPods: pods(filter: { club_id: $id, is_active: true }) {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      pod_images_and_videos {
        url
        type
      }
    }
    locations {
      id
      location_id
      location_name
      location_image
    }
  }
`;

export default function ClubDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { format: pricingFormat } = usePricing();
  const { isFollowing, toggle: toggleFollow } = useFollowedClubs();
  const [momentLightbox, setMomentLightbox] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const { data, loading, error } = useQuery(CLUB_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    if (!id) return;
    try {
      const list: string[] = JSON.parse(
        localStorage.getItem('duncit_saved_clubs') || '[]'
      );
      setSaved(list.includes(id));
    } catch {
      /* ignore */
    }
  }, [id]);

  if (loading && !data) return <ClubSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const club = data?.club;
  if (!club) return <Alert severity="warning">Club not found.</Alert>;

  const featureMedia = club.club_feature_images_and_videos ?? [];
  const moments = club.club_moments ?? [];
  const pods = data?.clubPods ?? [];
  const venueIds: string[] = club.meetup_venues_id ?? [];
  const venues = (data?.locations ?? []).filter(
    (l: any) => venueIds.includes(l.location_id) || venueIds.includes(l.id)
  );

  const social: { label: string; href: string; icon: React.ReactNode }[] = [];
  if (club.club_whats_app_community_link)
    social.push({
      label: 'Community',
      href: club.club_whats_app_community_link,
      icon: <WhatsAppIcon />,
    });
  if (club.club_whats_app_announcement_link)
    social.push({
      label: 'Announcements',
      href: club.club_whats_app_announcement_link,
      icon: <CampaignIcon />,
    });
  if (club.club_whats_app_group_link)
    social.push({
      label: 'Group chat',
      href: club.club_whats_app_group_link,
      icon: <ChatIcon />,
    });

  return (
    <Stack spacing={3} sx={{ pt: 0, pb: 6 }}>
      <ClubHero
        media={featureMedia}
        title={club.club_name}
        saved={saved}
        following={isFollowing(club.id)}
        onBack={() => navigate(-1)}
        onToggleFollow={() => {
          toggleFollow(club.id);
          notify(
            isFollowing(club.id)
              ? `Unfollowed ${club.club_name}`
              : `Following ${club.club_name}`,
            'success'
          );
        }}
        onToggleSave={() => {
          const next = !saved;
          setSaved(next);
          const key = 'duncit_saved_clubs';
          const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = next
            ? Array.from(new Set([...list, club.id]))
            : list.filter((x) => x !== club.id);
          localStorage.setItem(key, JSON.stringify(updated));
          notify(next ? 'Saved' : 'Removed from saved', 'success');
        }}
        onShare={async () => {
          const url = `${window.location.origin}/clubs/${club.id}`;
          try {
            if (navigator.share) {
              await navigator.share({ title: club.club_name, url });
            } else {
              await navigator.clipboard.writeText(url);
              notify('Link copied', 'success');
            }
          } catch {
            /* user cancelled */
          }
        }}
      />

      <Stack direction="row" alignItems="center" spacing={2}>
        <Avatar
          src={featureMedia[0]?.url}
          variant="rounded"
          sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}
        >
          <GroupsIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            {club.club_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {pods.length} active pods {venues.length > 0 ? `\u00b7 ${venues.length} cities` : ''}
          </Typography>
        </Box>
      </Stack>

      {social.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {social.map((s) => (
            <Button
              key={s.label}
              variant="outlined"
              startIcon={s.icon}
              size="small"
              component="a"
              href={s.href}
              target="_blank"
              rel="noreferrer"
              sx={{ textTransform: 'none' }}
            >
              {s.label}
            </Button>
          ))}
        </Stack>
      )}

      {club.club_description && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            About
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {club.club_description}
          </Typography>
        </Box>
      )}

      {venues.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Cities
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
            {venues.map((v: any) => (
              <Card
                key={v.id}
                variant="outlined"
                sx={{ minWidth: 120, flex: '0 0 auto', borderRadius: 2 }}
              >
                <Box
                  sx={{
                    height: 80,
                    backgroundImage: v.location_image ? `url(${v.location_image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    bgcolor: 'grey.100',
                  }}
                />
                <Box sx={{ p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {v.location_name}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      <Divider />

      <Box>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Upcoming pods
        </Typography>
        {pods.length === 0 ? (
          <Alert severity="info">No active pods in this club yet.</Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {pods.map((p: any) => {
              const isFree = p.pod_type?.includes('FREE');
              return (
                <Card key={p.id} variant="outlined">
                  <CardActionArea onClick={() => navigate(`/pods/${p.id}`)}>
                    {p.pod_images_and_videos?.[0]?.url ? (
                      <CardMedia
                        component="img"
                        image={p.pod_images_and_videos[0].url}
                        alt={p.pod_title}
                        sx={{ height: 160, objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 160,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'action.hover',
                        }}
                      >
                        <EventIcon fontSize="large" color="action" />
                      </Box>
                    )}
                    <CardContent>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {p.pod_title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {p.pod_date_time
                          ? new Date(p.pod_date_time).toLocaleString(undefined, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : '\u2014'}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mt: 1 }}
                      >
                        <Chip
                          size="small"
                          label={isFree ? 'Free' : pricingFormat(p.pod_amount)}
                          color={isFree ? 'success' : 'primary'}
                          variant={isFree ? 'outlined' : 'filled'}
                        />
                        {p.no_of_spots > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {p.pod_attendees?.length ?? 0}/{p.no_of_spots} spots
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {moments.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Moments
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 1,
            }}
          >
            {moments.map((m: any, i: number) => (
              <MomentTile
                key={i}
                url={m.url}
                type={m.type}
                aspect="1 / 1"
                index={i}
                total={moments.length}
                onClick={() => setMomentLightbox(i)}
              />
            ))}
          </Box>
          <MomentLightbox
            moments={moments}
            index={momentLightbox}
            onClose={() => setMomentLightbox(null)}
            onIndexChange={setMomentLightbox}
          />
        </Box>
      )}
    </Stack>
  );
}

function ClubSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
      <Stack direction="row" spacing={2} alignItems="center">
        <Skeleton variant="rounded" width={64} height={64} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="50%" height={36} />
          <Skeleton width="30%" height={20} />
        </Box>
      </Stack>
      <Skeleton variant="text" height={20} />
      <Skeleton variant="text" height={20} width="80%" />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </Stack>
  );
}
