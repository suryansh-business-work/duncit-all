import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { AdSlot } from '@/components/ads/AdSlot';
import { DetailHero, HeroButton } from '@/components/details/DetailHero';
import { PodAccordions } from '@/components/details/PodAccordions';
import { PodContactSupportLink } from '@/components/details/PodContactSupportLink';
import { PodInfo } from '@/components/details/PodInfo';
import { PodSchedule } from '@/components/details/PodSchedule';
import { PodSocialBar } from '@/components/details/PodSocialBar';
import { RefreshScrollView } from '@/components/PullToRefresh';
import type { PodDetail, usePodDetails } from '@/hooks/useDetails';
import { useTranslation } from '@/hooks/useTranslation';
import type { usePublicFinance } from '@/hooks/usePublicFinance';
import type { CartLineMeta } from '@/stores/cart.store';
import type { RootStackParamList } from '@/navigation/types';

import { PodShopSection } from './PodShopSection';
import type { PodDetailActions } from './usePodDetailActions';

type PodDetailsData = ReturnType<typeof usePodDetails>;

interface PodDetailsContentProps extends Pick<
  PodDetailsData,
  'venue' | 'location' | 'people' | 'spotFills' | 'seatsByUser' | 'categoryCrumbs' | 'refetch'
> {
  pod: PodDetail;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  goBack: () => void;
  actions: PodDetailActions;
  bookingBarHeight: number;
  isPodHost: boolean;
  isFree: boolean;
  saved: boolean;
  saveIcon: 'bookmark' | 'bookmark-border';
  savePending: boolean;
  toggleSave: () => void;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  toggleLike: () => void;
  onOpenComments: () => void;
  showProducts: boolean;
  selectedProducts: Record<string, number>;
  onSelectionChange: (next: Record<string, number>) => void;
  selectedTotal: number;
  onVariantQuantity: (meta: CartLineMeta, quantity: number) => void;
  finance: ReturnType<typeof usePublicFinance>;
  openClub: (clubSlug?: string | null) => void;
}

/** The loaded pod — hero gallery, overview, schedule/map, social bar, pod shop
 * and the accordion stack. */
export function PodDetailsContent(props: Readonly<PodDetailsContentProps>) {
  const { pod, navigation, actions, saved } = props;
  const { t } = useTranslation();
  return (
    <RefreshScrollView
      flex={1}
      contentContainerStyle={{ paddingBottom: props.bookingBarHeight + 16 }}
    >
      <DetailHero media={pod.pod_images_and_videos} onBack={props.goBack}>
        <HeroButton
          testID="pod-save"
          icon={props.saveIcon}
          label={saved ? t('mweb.podDetails.saved') : t('mweb.podDetails.save')}
          active={saved}
          loading={props.savePending}
          onPress={props.toggleSave}
        />
        <HeroButton
          testID="pod-share"
          icon="share"
          label={t('mweb.podDetails.share')}
          onPress={actions.onShare}
        />
      </DetailHero>
      <Reveal index={0}>
        <PodInfo
          pod={pod}
          categoryCrumbs={props.categoryCrumbs}
          isHost={props.isPodHost}
          onStatusAdded={props.refetch}
        />
      </Reveal>
      <Reveal index={1}>
        <PodSchedule
          pod={pod}
          venue={props.venue}
          location={props.location}
          onOpenVenue={(venueId) => navigation.navigate('VenueDetails', { venueId })}
          onJoinMeeting={() => actions.onJoinMeeting(pod.id)}
        />
      </Reveal>
      <YStack height={20} />
      <Reveal index={2}>
        <PodSocialBar
          liked={props.liked}
          likeCount={props.likeCount}
          commentCount={props.commentCount}
          onToggleLike={props.toggleLike}
          onOpenComments={props.onOpenComments}
        />
      </Reveal>
      <PodShopSection
        pod={pod}
        showProducts={props.showProducts}
        selectedProducts={props.selectedProducts}
        onSelectionChange={props.onSelectionChange}
        selectedTotal={props.selectedTotal}
        onVariantQuantity={props.onVariantQuantity}
      />
      <Reveal index={4}>
        <PodAccordions
          pod={pod}
          people={props.people}
          spotFills={props.spotFills}
          seatsByUser={props.seatsByUser}
          categoryCrumbs={props.categoryCrumbs}
          isFree={props.isFree}
          gstPct={props.finance.gstPct}
          currency={props.finance.currency}
          onOpenClub={() => props.openClub(pod.club_slug)}
          onOpenProfile={(userId) => navigation.navigate('PublicProfile', { userId })}
        />
      </Reveal>
      <Reveal index={5}>
        <YStack paddingHorizontal={16}>
          <AdSlot position="POD_DETAILS" variant="banner" />
        </YStack>
      </Reveal>
      <PodContactSupportLink
        onPress={() =>
          navigation.navigate('SupportTickets', { podId: pod.id, podTitle: pod.pod_title })
        }
      />
    </RefreshScrollView>
  );
}
