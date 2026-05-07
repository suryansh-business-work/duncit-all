import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import { usePricing } from '../hooks/usePricing';
import BackoutConfirmDialog from './pod-details-page/BackoutConfirmDialog';

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
    podMembershipState(pod_doc_id: $id) {
      pod_id
      is_member
      status
      can_backout
      can_join
      spots_taken
      spots_total
      refund_threshold_pct
      membership {
        id
        status
        referral_token
        refund_status
      }
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

const JOIN_FREE = gql`
  mutation JoinFreePod($id: ID!, $referral: String) {
    joinFreePod(pod_doc_id: $id, referral_token: $referral) {
      id
      status
    }
  }
`;
const BACKOUT = gql`
  mutation BackoutPod($id: ID!) {
    backoutPod(pod_doc_id: $id) {
      id
      status
      referral_token
      refund_status
    }
  }
`;
const REDEEM = gql`
  mutation RedeemReferral($token: String!) {
    redeemPodReferral(token: $token) {
      id
      status
    }
  }
`;

export default function PodDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const referralFromUrl = search.get('ref');
  const { compute: priceCompute, format: priceFormat } = usePricing();
  const { data, loading, error, refetch } = useQuery(POD_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const [incHits] = useMutation(INC_HITS);
  const [joinFree, joinState] = useMutation(JOIN_FREE);
  const [backout, backoutState] = useMutation(BACKOUT);
  const [redeem, redeemState] = useMutation(REDEEM);
  const [snack, setSnack] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [backoutOpen, setBackoutOpen] = useState(false);

  useEffect(() => {
    if (id) incHits({ variables: { id } }).catch(() => {});
  }, [id, incHits]);

  // If user landed via /pods/:id?ref=... try redeeming referral once
  useEffect(() => {
    if (!referralFromUrl || !id) return;
    redeem({ variables: { token: referralFromUrl } })
      .then(() => {
        setSnack('Joined via referral 🎉');
        refetch();
      })
      .catch((e) => setSnack(e.message));
  }, [referralFromUrl, id, redeem, refetch]);

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
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            aria-label={saved ? 'Saved' : 'Save'}
            onClick={() => setSaved((v) => !v)}
          >
            {saved ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
          </IconButton>
          <IconButton
            size="small"
            aria-label="Share"
            onClick={async () => {
              const url = window.location.href;
              const title = pod?.pod_title ?? 'Duncit Pod';
              try {
                if (navigator.share) {
                  await navigator.share({ title, url });
                } else {
                  await navigator.clipboard.writeText(url);
                  setSnack('Link copied');
                }
              } catch {
                /* user cancelled */
              }
            }}
          >
            <ShareIcon />
          </IconButton>
        </Stack>
      </Stack>

      {media.length > 0 ? (
        <Box
          sx={{
            mx: { xs: -2, sm: -3 },
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
                    height: { xs: 280, md: 460 },
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
                    height: { xs: 280, md: 460 },
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
      <PodActionPanel
        pod={pod}
        isFree={isFree}
        priceFormat={priceFormat}
        membershipState={data?.podMembershipState}
        joining={joinState.loading}
        backingOut={backoutState.loading}
        onJoinFree={async () => {
          try {
            await joinFree({ variables: { id: pod.id, referral: referralFromUrl } });
            setSnack('Joined!');
            await refetch();
          } catch (e: any) {
            setSnack(e.message);
          }
        }}
        onBackout={() => setBackoutOpen(true)}
        onPaidCheckout={() =>
          navigate('/checkout', {
            state: {
              pod_id: pod.id,
              pod_title: pod.pod_title,
              amount: Number(pod.pod_amount) || 0,
              description: `Pod booking · ${pod.pod_title}`,
            },
          })
        }
        onCopyReferral={(token: string) => {
          const url = `${window.location.origin}/pods/${pod.id}?ref=${token}`;
          navigator.clipboard?.writeText(url);
          setSnack('Referral link copied');
        }}
      />
      {snack && (
        <Alert severity="info" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      )}
      <BackoutConfirmDialog
        open={backoutOpen}
        onClose={() => setBackoutOpen(false)}
        busy={backoutState.loading}
        refundThresholdPct={data?.podMembershipState?.refund_threshold_pct ?? null}
        onConfirm={async () => {
          try {
            await backout({ variables: { id: pod.id } });
            setBackoutOpen(false);
            setSnack('You have backed out.');
            await refetch();
          } catch (e: any) {
            setBackoutOpen(false);
            setSnack(e.message);
          }
        }}
      />
    </Stack>
  );
}

function PodActionPanel({
  pod,
  isFree,
  priceFormat,
  membershipState,
  joining,
  backingOut,
  onJoinFree,
  onBackout,
  onPaidCheckout,
  onCopyReferral,
}: any) {
  const ms = membershipState;
  const isMember = ms?.is_member;
  const m = ms?.membership;
  const referralToken = m?.referral_token as string | null;

  if (isMember) {
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" color="success" disabled fullWidth>
            Joined ✓
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={onBackout}
            disabled={backingOut}
            fullWidth
          >
            Backout
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Refunds (paid pods) are processed once {ms?.refund_threshold_pct ?? 80}% of spots are
          filled or someone joins via your referral link.
        </Typography>
      </Stack>
    );
  }

  // Backed-out state — show referral
  if (m && m.status === 'BACKED_OUT' && referralToken) {
    return (
      <Stack spacing={1}>
        <Alert severity="warning">
          You have backed out. Refund status: <b>{m.refund_status}</b>
        </Alert>
        <Typography variant="body2">
          Refer a friend to refill your spot — your refund processes immediately when they join.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={() => onCopyReferral(referralToken)}
        >
          Copy referral link
        </Button>
        {(navigator as any).share && (
          <Button
            variant="text"
            startIcon={<ShareIcon />}
            onClick={() =>
              (navigator as any).share({
                title: pod.pod_title,
                url: `${window.location.origin}/pods/${pod.id}?ref=${referralToken}`,
              })
            }
          >
            Share
          </Button>
        )}
      </Stack>
    );
  }

  if (isFree) {
    return (
      <Button
        variant="contained"
        size="large"
        disabled={joining || ms?.can_join === false}
        onClick={onJoinFree}
      >
        {ms?.can_join === false ? 'Pod is full' : 'Join free pod'}
      </Button>
    );
  }

  return (
    <Button
      variant="contained"
      size="large"
      disabled={ms?.can_join === false}
      onClick={onPaidCheckout}
    >
      {ms?.can_join === false
        ? 'Pod is full'
        : `Book & Pay ${priceFormat(pod.pod_amount)}`}
    </Button>
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
