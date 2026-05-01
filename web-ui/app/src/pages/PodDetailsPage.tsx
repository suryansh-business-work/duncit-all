import { useEffect } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import GroupsIcon from '@mui/icons-material/Groups';
import RepeatIcon from '@mui/icons-material/Repeat';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePricing } from '../hooks/usePricing';

const POD_DETAILS = gql`
  query PodDetails($id: ID!) {
    pod(pod_doc_id: $id) {
      id
      pod_id
      pod_title
      pod_description
      pod_info
      pod_hashtag
      pod_images_and_videos {
        url
        type
      }
      pod_hits
      pod_attendees
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      zone_name
      club_id
      location_id
    }
    clubs {
      id
      club_name
      club_feature_images_and_videos {
        url
        type
      }
    }
    locations {
      id
      location_name
      location_image
    }
  }
`;

const INC_HITS = gql`
  mutation IncPodHits($id: ID!) {
    incrementPodHits(pod_doc_id: $id) {
      id
      pod_hits
    }
  }
`;

export default function PodDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { compute: priceCompute, format: priceFormat } = usePricing();
  const { data, loading, error } = useQuery(POD_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [incHits] = useMutation(INC_HITS);

  useEffect(() => {
    if (id) incHits({ variables: { id } }).catch(() => {});
  }, [id, incHits]);

  if (loading && !data) return <PodDetailsSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const pod = data?.pod;
  if (!pod) return <Alert severity="warning">Pod not found.</Alert>;

  const club = (data?.clubs ?? []).find((c: any) => c.id === pod.club_id);
  const location = (data?.locations ?? []).find((l: any) => l.id === pod.location_id);
  const isFree = pod.pod_type?.includes('FREE');
  const media = pod.pod_images_and_videos ?? [];

  return (
    <Stack spacing={3}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
      >
        Back
      </Button>

      {media.length > 0 ? (
        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            '.slick-dots': { bottom: 12 },
            '.slick-dots li button:before': { color: 'common.white', opacity: 0.6 },
            '.slick-dots li.slick-active button:before': { opacity: 1 },
          }}
        >
          <Slider
            dots
            arrows={media.length > 1}
            infinite={media.length > 1}
            autoplay={media.length > 1}
            autoplaySpeed={4500}
            slidesToShow={1}
            slidesToScroll={1}
          >
            {media.map((m: any, i: number) =>
              m.type === 'VIDEO' ? (
                <Box
                  key={i}
                  component="video"
                  src={m.url}
                  controls
                  sx={{
                    width: '100%',
                    height: { xs: 240, md: 400 },
                    objectFit: 'cover',
                    bgcolor: 'black',
                  }}
                />
              ) : (
                <Box
                  key={i}
                  component="img"
                  src={m.url}
                  alt={pod.pod_title}
                  sx={{
                    width: '100%',
                    height: { xs: 240, md: 400 },
                    objectFit: 'cover',
                  }}
                />
              )
            )}
          </Slider>
        </Box>
      ) : (
        <Box
          sx={{
            height: 240,
            borderRadius: 2,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EventIcon sx={{ fontSize: 80, color: 'action.disabled' }} />
        </Box>
      )}

      <Box>
        <Typography variant="h4" fontWeight={700}>
          {pod.pod_title}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            color={isFree ? 'success' : 'primary'}
            label={isFree ? 'Free' : priceFormat(pod.pod_amount)}
          />
          <Chip icon={<RepeatIcon />} label={pod.pod_occurrence?.replace(/_/g, ' ')} />
          <Chip icon={<VisibilityIcon />} label={`${pod.pod_hits} views`} variant="outlined" />
          {pod.no_of_spots > 0 && (
            <Chip
              label={`${pod.pod_attendees?.length ?? 0}/${pod.no_of_spots} spots`}
              variant="outlined"
            />
          )}
        </Stack>
        {!isFree && Number(pod.pod_amount) > 0 && (() => {
          const p = priceCompute(pod.pod_amount);
          return (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Inclusive of Platform Fee ({p.feePct}%) {p.currency}{p.fee.toFixed(2)} + GST ({p.gstPct}%) {p.currency}{p.gst.toFixed(2)}
            </Typography>
          );
        })()}
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Row icon={<EventIcon color="primary" />} label="When">
              {pod.pod_date_time
                ? new Date(pod.pod_date_time).toLocaleString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '\u2014'}
              {pod.pod_end_date_time
                ? `  \u2192  ${new Date(pod.pod_end_date_time).toLocaleString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`
                : ''}
            </Row>
            <Row icon={<PlaceIcon color="primary" />} label="Where">
              {location?.location_name ?? '\u2014'}
              {pod.zone_name ? ` \u00b7 ${pod.zone_name}` : ''}
            </Row>
            <Row icon={<GroupsIcon color="primary" />} label="Club">
              {club ? (
                <Button
                  size="small"
                  onClick={() => navigate(`/clubs/${club.id}`)}
                  sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                >
                  {club.club_name}
                </Button>
              ) : (
                '\u2014'
              )}
            </Row>
          </Stack>
        </CardContent>
      </Card>

      {pod.pod_description && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            About this pod
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {pod.pod_description}
          </Typography>
        </Box>
      )}

      {pod.pod_info && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            What to expect
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {pod.pod_info}
          </Typography>
        </Box>
      )}

      {pod.pod_hashtag?.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {pod.pod_hashtag.map((t: string) => (
            <Chip key={t} size="small" label={`#${t}`} />
          ))}
        </Stack>
      )}

      <Divider />
      <Button
        variant="contained"
        size="large"
        disabled={isFree}
        onClick={() =>
          navigate('/checkout', {
            state: {
              pod_id: pod.id,
              pod_title: pod.pod_title,
              amount: Number(pod.pod_amount) || 0,
              description: `Pod booking · ${pod.pod_title}`,
            },
          })
        }
      >
        {isFree ? 'Free pod — booking coming soon' : `Book & Pay ${priceFormat(pod.pod_amount)}`}
      </Button>
    </Stack>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Avatar
        variant="rounded"
        sx={{ width: 36, height: 36, bgcolor: 'action.hover' }}
      >
        {icon}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {children}
        </Typography>
      </Box>
    </Stack>
  );
}

function PodDetailsSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      <Skeleton width="60%" height={40} />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={80} height={28} />
        <Skeleton variant="rounded" width={120} height={28} />
        <Skeleton variant="rounded" width={100} height={28} />
      </Stack>
      <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
      <Skeleton variant="text" height={28} width="40%" />
      <Skeleton variant="text" height={20} />
      <Skeleton variant="text" height={20} width="80%" />
    </Stack>
  );
}
