import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { usePricing } from '../hooks/usePricing';
import BackoutConfirmDialog from './pod-details-page/BackoutConfirmDialog';
import PodHero from './pod-details-page/PodHero';
import PodActionPanel from './pod-details-page/PodActionPanel';
import PodDetailAccordions from './pod-details-page/PodDetailAccordions';
import {
  POD_DETAILS,
  INC_HITS,
  JOIN_FREE,
  BACKOUT,
  REDEEM,
  PodDetailsSkeleton,
} from './pod-details-page/queries';

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
  const [redeem] = useMutation(REDEEM);
  const [snack, setSnack] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [backoutOpen, setBackoutOpen] = useState(false);

  useEffect(() => {
    if (id) incHits({ variables: { id } }).catch(() => {});
  }, [id, incHits]);

  useEffect(() => {
    if (!referralFromUrl || !id) return;
    redeem({ variables: { token: referralFromUrl } })
      .then(() => {
        setSnack('Joined via referral');
        refetch();
      })
      .catch((e) => setSnack(e.message));
  }, [referralFromUrl, id, redeem, refetch]);

  if (loading && !data) return <PodDetailsSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const pod = data?.pod;
  if (!pod) return <Alert severity="warning">Pod not found.</Alert>;

  const club = (data?.clubs ?? []).find((c: any) => c.id === pod.club_id) ?? null;
  const location = (data?.locations ?? []).find((l: any) => l.id === pod.location_id);
  const allHosts: any[] = data?.publicHosts ?? [];
  const podHosts = allHosts.filter((h: any) =>
    (pod.pod_hosts_id ?? []).includes(h.user_id)
  );
  const isFree = pod.pod_type?.includes('FREE');
  const media = pod.pod_images_and_videos ?? [];

  const onShare = async () => {
    const url = window.location.href;
    const title = pod?.pod_title ?? 'Duncit Pod';
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setSnack('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Stack spacing={3} sx={{ pt: 0, pb: 10 }}>
      <PodHero
        media={media}
        title={pod.pod_title}
        saved={saved}
        onBack={() => navigate(-1)}
        onToggleSave={() => setSaved((v) => !v)}
        onShare={onShare}
      />

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
              Inclusive of Platform Fee ({p.feePct}%) {p.currency}
              {p.fee.toFixed(2)} + GST ({p.gstPct}%) {p.currency}
              {p.gst.toFixed(2)}
            </Typography>
          );
        })()}
      </Box>

      <PodDetailAccordions
        pod={pod}
        club={club}
        locationName={location?.location_name}
        hosts={podHosts}
      />

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
