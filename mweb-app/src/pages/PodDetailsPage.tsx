import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { usePricing } from '../hooks/usePricing';
import BackoutConfirmDialog from './pod-details-page/BackoutConfirmDialog';
import PodHero from './pod-details-page/PodHero';
import PodOverview from './pod-details-page/PodOverview';
import StickyPodActionPanel from './pod-details-page/StickyPodActionPanel';
import PodDetailAccordions from './pod-details-page/PodDetailAccordions';
import PodMapSection from '../components/pod-details/PodMapSection';
import PodSocialBar from './pod-details-page/PodSocialBar';
import { usePodDetailActions } from './pod-details-page/usePodDetailActions';
import {
  POD_DETAILS,
  POD_ID_BY_SLUGS,
  POD_PEOPLE,
  PodDetailsSkeleton,
} from './pod-details-page/queries';

export default function PodDetailsPage() {
  const { clubSlug = '', podSlug = '' } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const referralFromUrl = search.get('ref');
  const { compute: priceCompute, format: priceFormat } = usePricing();

  const slugResolution = useQuery(POD_ID_BY_SLUGS, {
    variables: { clubSlug, podSlug },
    skip: !clubSlug || !podSlug,
    fetchPolicy: 'cache-and-network',
  });
  const id: string = slugResolution.data?.podBySlugs?.id ?? '';

  const { data, loading, error, refetch } = useQuery(POD_DETAILS, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const peopleIds = useMemo<string[]>(() => {
    const pod = data?.pod;
    if (!pod) return [];
    const ids = [
      ...((pod.pod_hosts_id ?? []) as string[]),
      ...((pod.pod_attendees ?? []) as string[]),
    ];
    return Array.from(new Set(ids.filter(Boolean)));
  }, [data?.pod]);

  const { data: peopleData } = useQuery(POD_PEOPLE, {
    variables: { ids: peopleIds },
    skip: peopleIds.length === 0,
    fetchPolicy: 'cache-and-network',
  });

  // Derive early so hooks are always called unconditionally (Rules of Hooks).
  const pod = data?.pod ?? null;
  const savedIds: string[] = data?.me?.saved_pod_ids ?? [];
  const saved = pod ? savedIds.includes(pod.id) : false;

  // MUST be called before any conditional returns.
  const actions = usePodDetailActions({
    id,
    pod,
    saved,
    savedIds,
    referralFromUrl,
    refetch,
    navigate,
  });

  if (slugResolution.loading || (loading && !data)) return <PodDetailsSkeleton />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!slugResolution.loading && !slugResolution.data?.podBySlugs) {
    return <Alert severity="warning">Pod not found.</Alert>;
  }
  if (!pod) return <Alert severity="warning">Pod not found.</Alert>;

  const club = (data?.clusters ?? data?.clubs ?? []).find((c: any) => c.id === pod.club_id) ?? null;
  const location = (data?.locations ?? []).find((l: any) => l.id === pod.location_id);
  const venue = (data?.publicVenues ?? []).find((item: any) => item.id === pod.venue_id);
  const allPeople: any[] = peopleData?.publicUsersByIds ?? [];
  const peopleById = new Map(allPeople.map((p: any) => [p.user_id, p]));

  // Merge: for hosts, prefer publicHosts (passport_photo_url) but fall back to publicUsersByIds
  const allHosts: any[] = data?.publicHosts ?? [];
  const hostsById = new Map(allHosts.map((h: any) => [h.user_id, h]));
  const podHosts = (pod.pod_hosts_id ?? []).map((uid: string) => {
    const h = hostsById.get(uid);
    const p = peopleById.get(uid);
    return {
      user_id: uid,
      full_name: h?.full_name || p?.full_name || null,
      passport_photo_url: h?.passport_photo_url || null,
      profile_photo: p?.profile_photo || null,
    };
  });

  const isFree = pod.pod_type?.includes('FREE');
  const media = pod.pod_images_and_videos ?? [];

  return (
    <Stack spacing={3} sx={{ pt: 0, pb: 'calc(132px + env(safe-area-inset-bottom))' }}>
      <PodHero
        media={media}
        title={pod.pod_title}
        saved={saved}
        onBack={() => navigate(-1)}
        onToggleSave={actions.onToggleSave}
        onShare={actions.onShare}
      />

      <PodOverview pod={pod} isFree={isFree} priceFormat={priceFormat} />

      <PodMapSection pod={pod} location={location} venue={venue} />

      <PodSocialBar
        podId={pod.id}
        initialLiked={!!pod.liked_by_me}
        initialLikeCount={pod.like_count ?? 0}
        initialCommentCount={pod.comment_count ?? 0}
        viewerId={data?.me?.user_id ?? null}
      />

      <PodDetailAccordions
        pod={pod}
        club={club}
        hosts={podHosts}
        attendees={allPeople}
        isFree={isFree}
        priceCompute={priceCompute}
      />

      {pod.pod_hashtag?.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {pod.pod_hashtag.map((t: string) => (
            <Chip key={t} size="small" label={`#${t}`} />
          ))}
        </Stack>
      )}

      <StickyPodActionPanel
        pod={pod}
        isFree={isFree}
        priceFormat={priceFormat}
        membershipState={data?.podMembershipState}
        joining={actions.joinState.loading}
        backingOut={actions.backoutState.loading}
        onJoinFree={actions.onJoinFree}
        onBackout={() => actions.setBackoutOpen(true)}
        onPaidCheckout={actions.onPaidCheckout}
        onCopyReferral={actions.onCopyReferral}
      />
      {actions.snack && (
        <Alert severity="info" onClose={() => actions.setSnack(null)}>
          {actions.snack}
        </Alert>
      )}
      <BackoutConfirmDialog
        open={actions.backoutOpen}
        onClose={() => actions.setBackoutOpen(false)}
        busy={actions.backoutState.loading}
        refundThresholdPct={data?.podMembershipState?.refund_threshold_pct ?? null}
        onConfirm={actions.onConfirmBackout}
      />
    </Stack>
  );
}
