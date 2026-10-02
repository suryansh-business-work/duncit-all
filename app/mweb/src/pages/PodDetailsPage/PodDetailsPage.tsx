import { backoutAttemptsLeft as attemptsLeftFor } from '@duncit/utils';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import { categoryPath } from '../../utils/category-match';
import PodHero from '../pod-details-page/PodHero';
import PodOverview from '../pod-details-page/PodOverview';
import StickyPodActionPanel from '../pod-details-page/StickyPodActionPanel';
import PodDetailAccordions from '../pod-details-page/PodDetailAccordions';
import PodMapSection from '../../components/pod-details/PodMapSection';
import PodSocialBar from '../pod-details-page/PodSocialBar';
import AdSlot from '../../components/ads/AdSlot';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useStudioMode } from '../../StudioModeContext';
import { STUDIO_HOME_PATH } from '../../studio-mode';
import LocationMismatchDialog from '../../components/LocationMismatchDialog';
import { useStatusUpload } from '../../components/status-upload/StatusUploadProvider';
import { PodDetailsSkeleton } from '../pod-details-page/queries';
import PodCommerceSection from './PodCommerceSection';
import PodDetailsDialogs from './PodDetailsDialogs';
import PodHashtagsAndSupport from './PodHashtagsAndSupport';
import { usePodDetailsData } from './usePodDetailsData';

export default function PodDetailsPage() {
  const { clubSlug = '', podSlug = '' } = useParams();
  const navigate = useNavigate();
  const { setMode } = useStudioMode();
  const { t } = useTranslation();
  const { openPodPicker } = useStatusUpload();
  const [search] = useSearchParams();
  const referralFromUrl = search.get('ref');
  const { compute: priceCompute, format: priceFormat, currency: priceCurrency } = usePricing();
  const showProducts = useFeatureFlag('is_product_visible');
  const {
    slugResolution, id, data, error, refetch, peopleData, spotFillData, joinMeeting,
    seatsByUser, pod, locationPrompt, productSelection, actions,
  } = usePodDetailsData({ clubSlug, podSlug, referralFromUrl, navigate });

  // The skeleton is for a page with nothing to show yet, so both halves wait on
  // DATA, never on `loading`. `cache-and-network` answers a revisit from the
  // cache while `loading` is still true, and Apollo 4 sets `loading` again on
  // every refetch — gating on it put the skeleton back on every Back and after
  // every join/save. Waiting on `data` still covers the gap between the slug
  // resolving and POD_DETAILS starting, so there is no "Pod not found." flash.
  const slugPending = slugResolution.loading && !slugResolution.data;
  const detailsPending = !!id && !error && !data;
  if (slugPending || detailsPending) return <PodDetailsSkeleton />;
  // The slug lookup FAILING is not the same as the pod not existing. A request
  // the retry link will not retry — an abort, a 4xx — leaves `id` empty with no
  // error of its own on POD_DETAILS, and that fell straight through to "Pod not
  // found.": the page reads as a deleted pod and hides the only thing that
  // would explain it. Report whichever query actually failed.
  const failure = slugResolution.error ?? error;
  if (failure) return <Alert severity="error" data-testid="pod-details-error">{failure.message}</Alert>;
  if (!pod) return <Alert severity="warning" data-testid="pod-details-not-found">{t('mweb.podDetails.notFound')}</Alert>;

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

  const isFree = pod.pod_type === 'FREE';
  const isPodHost = (pod.pod_hosts_id ?? []).includes(data?.me?.user_id);
  const media = pod.pod_images_and_videos ?? [];
  const membershipState = data?.podMembershipState;
  const backoutAttemptsLeft = attemptsLeftFor(membershipState);
  // The link comes back from a write that may have just marked this member
  // present, so the pod is re-read behind it — not awaited, so the tab opens
  // while the click's activation is still fresh.
  const onJoinMeeting = async (): Promise<string> => {
    const result = await joinMeeting({ variables: { id: pod.id } });
    refetch().catch(() => undefined);
    return result.data.joinPodMeeting.meeting_url;
  };
  return (
    <Stack
      spacing={2.5}
      data-testid="pod-details-screen"
      sx={{
        pt: 0,
        // Kept on the page, unlike the other surfaces: the shell already
        // reserves the bottom bar, but StickyPodActionPanel floats a second
        // fixed bar above it that only this page has to clear.
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

      <PodMapSection pod={pod} location={location} venue={venue} onJoinMeeting={onJoinMeeting} />

      <PodSocialBar
        podId={pod.id}
        initialLiked={!!pod.liked_by_me}
        initialLikeCount={pod.like_count ?? 0}
        initialCommentCount={pod.comment_count ?? 0}
        viewerId={data?.me?.user_id ?? null}
      />

      <AdSlot position="POD_DETAILS" variant="banner" />

      {showProducts && pod.product_requests?.some((item: any) => item?.product_name) && (
        <PodCommerceSection pod={pod} priceFormat={priceFormat} productSelection={productSelection} />
      )}

      <PodDetailAccordions
        pod={pod}
        club={club}
        hosts={podHosts}
        attendees={allPeople}
        spotFills={spotFillData?.podSpotFills ?? []}
        seatsByUser={seatsByUser}
        isFree={isFree}
        priceCompute={priceCompute}
        categoryCrumbs={clubCategoryCrumbs}
      />

      <PodHashtagsAndSupport pod={pod} />

      <StickyPodActionPanel
        pod={pod}
        isFree={isFree}
        isHost={isPodHost}
        priceFormat={priceFormat}
        membershipState={data?.podMembershipState}
        joining={actions.joinState.loading}
        backingOut={actions.backoutState.loading}
        restoringSpot={actions.cancelBackoutState.loading}
        seats={actions.seats}
        onSeatsChange={actions.setSeats}
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
        <Alert severity="info" data-testid="pod-details-snack" onClose={() => actions.setSnack(null)}>
          {actions.snack}
        </Alert>
      )}
      <PodDetailsDialogs
        actions={actions}
        membershipState={data?.podMembershipState}
        currency={priceCurrency}
        backoutAttemptsLeft={backoutAttemptsLeft}
      />
      <LocationMismatchDialog kind="POD" {...locationPrompt} />
    </Stack>
  );
}
