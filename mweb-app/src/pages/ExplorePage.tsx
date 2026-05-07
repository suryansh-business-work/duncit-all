import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { usePricing } from '../hooks/usePricing';

const EXPLORE_PODS = gql`
  query ExplorePods {
    me {
      user_id
      saved_pod_ids
    }
    pods(filter: { is_active: true }) {
      id
      pod_id
      pod_title
      pod_description
      pod_date_time
      pod_type
      pod_amount
      pod_attendees
      no_of_spots
      zone_name
      pod_images_and_videos {
        url
        type
      }
      club_id
      location_id
    }
    clubs(filter: { is_active: true }) {
      id
      club_name
      super_category_id
      club_feature_images_and_videos {
        url
        type
      }
    }
    superCategories: categories(filter: { level: SUPER }) {
      id
      slug
    }
    locations {
      id
      location_name
    }
  }
`;

const TOGGLE_SAVED_POD = gql`
  mutation ToggleSavedPod($pod_doc_id: ID!) {
    toggleSavedPod(pod_doc_id: $pod_doc_id) {
      pod_id
      saved
      saved_pod_ids
    }
  }
`;

interface ExplorePageProps {
  superCategorySlug?: string;
}

export default function ExplorePage({ superCategorySlug }: ExplorePageProps) {
  const { data, loading, error } = useQuery(EXPLORE_PODS, {
    fetchPolicy: 'cache-and-network',
  });
  const [toggleSavedPod] = useMutation(TOGGLE_SAVED_POD);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSaved(new Set(data?.me?.saved_pod_ids ?? []));
  }, [data?.me?.saved_pod_ids]);

  const clubsById = useMemo(() => {
    const m = new Map<string, any>();
    (data?.clubs ?? []).forEach((c: any) => m.set(c.id, c));
    return m;
  }, [data]);
  const locById = useMemo(() => {
    const m = new Map<string, any>();
    (data?.locations ?? []).forEach((l: any) => m.set(l.id, l));
    return m;
  }, [data]);

  const pods = useMemo(() => {
    const list = (data?.pods ?? []).slice();
    const supers = data?.superCategories ?? [];
    const selectedSuperId = superCategorySlug
      ? supers.find((s: any) => s.slug === superCategorySlug)?.id
      : null;
    const filtered = selectedSuperId
      ? list.filter((p: any) => clubsById.get(p.club_id)?.super_category_id === selectedSuperId)
      : list;
    filtered.sort(
      (a: any, b: any) =>
        new Date(a.pod_date_time || 0).getTime() -
        new Date(b.pod_date_time || 0).getTime(),
    );
    return filtered;
  }, [data, clubsById, superCategorySlug]);

  const toggleSave = async (id: string) => {
    const previous = saved;
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      const res = await toggleSavedPod({ variables: { pod_doc_id: id } });
      setSaved(new Set(res.data?.toggleSavedPod?.saved_pod_ids ?? []));
    } catch {
      setSaved(previous);
    }
  };

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!pods.length) return <Alert severity="info">No pods to explore yet.</Alert>;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          // TikTok-like vertical full-height snap feed. The page is rendered
          // edge-to-edge (no Container padding) so we manage our own bottom
          // inset to clear the fixed BottomNav.
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          '&::-webkit-scrollbar': { width: 0 },
        }}
      >
      {pods.map((p: any) => (
        <ExplorePodCard
          key={p.id}
          pod={p}
          club={clubsById.get(p.club_id)}
          location={locById.get(p.location_id)}
          saved={saved.has(p.id)}
          onToggleSave={() => toggleSave(p.id)}
        />
      ))}
      </Box>
    </Box>
  );
}

function ExplorePodCard({
  pod,
  club,
  location,
  saved,
  onToggleSave,
}: {
  pod: any;
  club: any;
  location: any;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const navigate = useNavigate();
  const { format } = usePricing();
  const isFree = pod.pod_type?.includes('FREE');
  const media = pod.pod_images_and_videos?.[0];
  const cover = club?.club_feature_images_and_videos?.[0]?.url;

  const share = async () => {
    const url = `${window.location.origin}/pods/${pod.id}`;
    const shareData = {
      title: pod.pod_title,
      text: pod.pod_description?.slice(0, 100) ?? pod.pod_title,
      url,
    };
    try {
      // Web Share API where supported (mobile, https)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        flexShrink: 0,
        scrollSnapAlign: 'start',
        bgcolor: 'common.black',
        color: 'common.white',
        overflow: 'hidden',
      }}
    >
      {media?.type === 'VIDEO' ? (
        <Box
          component="video"
          src={media.url}
          autoPlay
          muted
          loop
          playsInline
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : media?.url || cover ? (
        <Box
          component="img"
          src={media?.url || cover}
          alt={pod.pod_title}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.900',
          }}
        >
          <EventIcon sx={{ fontSize: 80, color: 'grey.700' }} />
        </Box>
      )}

      {/* Bottom gradient with details */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      <Stack
        sx={{
          position: 'absolute',
          left: 16,
          right: 80,
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
        }}
        spacing={1}
      >
        {club && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate(`/clubs/${club.id}`)}
          >
            <GroupsIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>
              {club.club_name}
            </Typography>
          </Stack>
        )}
        <Typography variant="h6" fontWeight={700}>
          {pod.pod_title}
        </Typography>
        {pod.pod_description && (
          <Typography
            variant="body2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              opacity: 0.9,
            }}
          >
            {pod.pod_description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={isFree ? 'Free' : format(pod.pod_amount)}
            color={isFree ? 'success' : 'primary'}
            sx={{ color: 'common.white' }}
          />
          {pod.pod_date_time && (
            <Chip
              size="small"
              icon={<EventIcon sx={{ color: 'common.white !important' }} />}
              label={new Date(pod.pod_date_time).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
          {(location?.location_name || pod.zone_name) && (
            <Chip
              size="small"
              icon={<PlaceIcon sx={{ color: 'common.white !important' }} />}
              label={[location?.location_name, pod.zone_name].filter(Boolean).join(' · ')}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'common.white' }}
            />
          )}
        </Stack>
      </Stack>

      {/* Right action rail */}
      <Stack
        spacing={1.5}
        alignItems="center"
        sx={{
          position: 'absolute',
          right: 12,
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
        }}
      >
        <ActionButton
          icon={<HowToRegIcon />}
          label={`${pod.pod_attendees?.length ?? 0}${
            pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : ''
          }`}
          onClick={() => navigate(`/pods/${pod.id}`)}
          tooltip="Join"
        />
        <ActionButton
          icon={saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          label="Save"
          onClick={onToggleSave}
          active={saved}
        />
        <ActionButton icon={<ShareIcon />} label="Share" onClick={share} />
        <ActionButton
          icon={<OpenInNewIcon />}
          label="Open"
          onClick={() => navigate(`/pods/${pod.id}`)}
        />
      </Stack>
    </Box>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
}) {
  return (
    <Stack alignItems="center" spacing={0.25}>
      <IconButton
        onClick={onClick}
        title={tooltip}
        sx={{
          bgcolor: 'rgba(255,255,255,0.15)',
          color: active ? 'primary.light' : 'common.white',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
        }}
      >
        {icon}
      </IconButton>
      <Typography variant="caption" sx={{ color: 'common.white' }}>
        {label}
      </Typography>
    </Stack>
  );
}
