import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { usePricing } from '../hooks/usePricing';
import { categoryPath } from '../utils/category-match';
import BackoutConfirmDialog from './pod-details-page/BackoutConfirmDialog';
import KeepSpotDialog from './pod-details-page/KeepSpotDialog';
import PodHero from './pod-details-page/PodHero';
import PodOverview from './pod-details-page/PodOverview';
import PodCommercePreview from './pod-details-page/PodCommercePreview';
import { isPodExpired } from '../utils/podStatus';
import StickyPodActionPanel from './pod-details-page/StickyPodActionPanel';
import PodDetailAccordions from './pod-details-page/PodDetailAccordions';
import PodMapSection from '../components/pod-details/PodMapSection';
import PodSocialBar from './pod-details-page/PodSocialBar';
import AdSlot from '../components/ads/AdSlot';
import { usePodDetailActions } from './pod-details-page/usePodDetailActions';
import { usePodProductSelection } from './pod-details-page/usePodProductSelection';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useStudioMode } from '../StudioModeContext';
import { STUDIO_HOME_PATH } from '../studio-mode';
import ConfettiOverlay from '../components/ConfettiOverlay';
import { useStatusUpload } from '../components/status-upload/StatusUploadProvider';
import {
  POD_DETAILS,
  POD_ID_BY_SLUGS,
  POD_PEOPLE,
  PodDetailsSkeleton,
} from './pod-details-page/queries';

export default function PodDetailsPage() {
  const { clubSlug = '', podSlug = '' } = useParams();
  const navigate = useNavigate();
  const { setMode } = useStudioMode();
  const { openPodPicker } = useStatusUpload();
  const [search] = useSearchParams();
  const referralFromUrl = search.get('ref');
  const { compute: priceCompute, format: priceFormat, currency: priceCurrency } = usePricing();
  const showProducts = useFeatureFlag('is_product_visible');
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
  const pod = data?.pod ?? null;
  const productSelection = usePodProductSelection(id, pod);
  const savedIds: string[] = data?.me?.saved_pod_ids ?? [];
  const saved = pod ? savedIds.includes(pod.id) : false;
  const actions = usePodDetailActions({
    id,
    pod,
    saved,
    savedIds,
    referralFromUrl,
    selectedProducts: productSelection.selectedProductList,
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
  const clubCategoryCrumbs = categoryPath(
    data?.categories ?? [],
    club?.super_category_id,
    club?.category_id,
  );
  const location = (data?.locations ?? []).find((l: any) => l.id === pod.location_id);
  const venue = (data?.publicVenues ?? []).find((item: any) => item.id === pod.venue_id);
  const allPeople: any[] = peopleData?.publicUsersByIds ?? [];
  const peopleById = new Map(allPeople.map((p: any) => [p.user_id, p]));
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
  const isPodHost = (pod.pod_hosts_id ?? []).includes(data?.me?.user_id);
  const media = pod.pod_images_and_videos ?? [];
  const supportSubject = `Support - ${pod.pod_title}`;
  const membershipState = data?.podMembershipState;
  const backoutAttemptsLeft = Math.max(
    0,
    (membershipState?.backout_attempts_max ?? 0) - (membershipState?.backout_attempts_used ?? 0),
  );
  return (
    <Stack
      spacing={3}
      sx={{
        pt: 0,
        pb: 'calc(var(--duncit-bottom-nav-height, 72px) + env(safe-area-inset-bottom) + 24px)',
      }}
    >
      <PodHero
        media={media}
        title={pod.pod_title}
        saved={actions.displaySaved}
        saveLoading={actions.savePending}
        onBack={() => navigate(-1)}
        onToggleSave={actions.onToggleSave}
        onShare={actions.onShare}
      />

      <PodOverview pod={pod} isFree={isFree} isHost={isPodHost} priceFormat={priceFormat} onAddStatus={() => openPodPicker(pod.id)} categoryCrumbs={clubCategoryCrumbs} />

      <PodMapSection pod={pod} location={location} venue={venue} />

      <PodSocialBar
        podId={pod.id}
        initialLiked={!!pod.liked_by_me}
        initialLikeCount={pod.like_count ?? 0}
        initialCommentCount={pod.comment_count ?? 0}
        viewerId={data?.me?.user_id ?? null}
      />

      <AdSlot position="POD_DETAILS" variant="banner" />

      {showProducts && pod.product_requests?.some((item: any) => item?.product_name) && (
        <PodCommercePreview
          pod={pod}
          priceFormat={priceFormat}
          selectedProducts={productSelection.selectedProducts}
          onSelectionChange={productSelection.setSelectedProducts}
          selectedTotal={productSelection.selectedProductTotal}
          onVariantQuantity={(row, variant, quantity) =>
            productSelection.setVariantQuantity(
              {
                pod_id: pod.id,
                pod_title: pod.pod_title ?? '',
                club_slug: pod.club_slug ?? '',
                product_id: row.product_id,
                variant_id: variant.id,
                variant_label: variant.label,
                product_name: row.product_name ?? 'Product',
                image_url: variant.image_url || row.image_url || '',
                unit_cost: variant.unit_cost,
                max_quantity: variant.max,
              },
              quantity,
            )
          }
          viewOnly={!!data?.podMembershipState?.is_member || isPodExpired(pod.pod_date_time)}
        />
      )}

      <PodDetailAccordions
        pod={pod}
        club={club}
        hosts={podHosts}
        attendees={allPeople}
        isFree={isFree}
        priceCompute={priceCompute}
        categoryCrumbs={clubCategoryCrumbs}
      />

      {pod.pod_hashtag?.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {pod.pod_hashtag.map((t: string) => (
            <Chip key={t} size="small" label={`#${t}`} />
          ))}
        </Stack>
      )}

      <Button
        variant="text"
        size="small"
        startIcon={<ContactSupportIcon />}
        onClick={() =>
          navigate(
            `/support/tickets?category=BOOKING&podId=${pod.id}&podTitle=${encodeURIComponent(pod.pod_title)}&subject=${encodeURIComponent(supportSubject)}`
          )
        }
        sx={{ alignSelf: 'flex-start', fontWeight: 800 }}
      >
        Contact support about this pod
      </Button>

      <StickyPodActionPanel
        pod={pod}
        isFree={isFree}
        isHost={isPodHost}
        priceFormat={priceFormat}
        membershipState={data?.podMembershipState}
        joining={actions.joinState.loading}
        backingOut={actions.backoutState.loading}
        restoringSpot={actions.cancelBackoutState.loading}
        selectedProductTotal={productSelection.selectedProductTotal}
        onJoinFree={actions.onJoinFree}
        onBackout={() => actions.setBackoutOpen(true)}
        onKeepSpot={actions.openKeepSpot}
        onPaidCheckout={actions.onPaidCheckout}
        onCopyReferral={actions.onCopyReferral}
        onGoToDashboard={() => {
          setMode('HOST');
          navigate(STUDIO_HOME_PATH.HOST);
        }}
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
        refundAmount={data?.podMembershipState?.backout_refund_amount ?? null}
        currency={priceCurrency}
        deductionPct={data?.podMembershipState?.backout_deduction_pct ?? 0}
        onConfirm={actions.onConfirmBackout}
      />
      <KeepSpotDialog
        open={actions.keepSpotOpen}
        onClose={() => actions.setKeepSpotOpen(false)}
        busy={actions.cancelBackoutState.loading}
        attemptsLeft={backoutAttemptsLeft}
        error={actions.keepSpotError}
        onConfirm={actions.onConfirmKeepSpot}
      />
      <ConfettiOverlay
        open={actions.confettiOpen}
        onClose={() => actions.setConfettiOpen(false)}
      />
    </Stack>
  );
}
