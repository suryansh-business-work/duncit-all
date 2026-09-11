import { Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import type { ExploreClub, ExplorePod, LikeState } from '@/stores/explore.store';
import { isPodExpired, podPriceLabel, podWebUrl } from '@/utils/pod-format';
import { shareUrl } from '@/services/share-link';
import { ExploreActionRail } from '@/components/explore/ExploreActionRail';
import { ExploreJoinBar } from '@/components/explore/ExploreJoinBar';
import { ExplorePodOverlay } from '@/components/explore/ExplorePodOverlay';
import { DoubleTapJoin } from '@/components/explore/DoubleTapJoin';
import { ReelBackdrop } from '@/components/explore/ReelVideo';
import { podSeatsTaken } from '@duncit/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface ExplorePodCardProps {
  pod: ExplorePod;
  club?: ExploreClub;
  width: number;
  height: number;
  /** True while this card is the visible reel — gates video playback. */
  isActive: boolean;
  saved: boolean;
  savePending?: boolean;
  like: LikeState;
  commentCount: number;
  onToggleSave: () => void;
  onToggleLike: () => void;
  onComment: () => void;
  onOpen: () => void;
  onOpenClub?: () => void;
  onShowLikers?: () => void;
}

/** One full-screen reel: the pod's reel video, info overlay, the right-side
 * action rail (join/like/comment/save/share/open) and the join bar. */
export function ExplorePodCard({
  pod,
  club,
  width,
  height,
  isActive,
  saved,
  savePending,
  like,
  commentCount,
  onToggleSave,
  onToggleLike,
  onComment,
  onOpen,
  onOpenClub,
  onShowLikers,
}: Readonly<ExplorePodCardProps>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Stack bottom→top: floating nav · CTA bar · (info overlay + action rail).
  const ctaBottom = insets.bottom + 80;
  const contentBottom = ctaBottom + 84; // clears the CTA bar above
  // Space the action rail can occupy before it would overlap the header/overlay;
  // the rail collapses extra actions into a "More" menu on short screens.
  const railAvailable = height - contentBottom - (insets.top + 56);
  const attendees = podSeatsTaken(pod);
  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
  // Expired pods can't be joined — the join rail + CTA become an "expired" notice.
  const expired = isPodExpired(pod.pod_date_time);
  const joinLabel = expired ? 'Expired' : `${attendees}${spotsSuffix}`;
  // Free pods need no payment, so the "Confirm with UPI" copy is hidden for them.
  const paidSubtitle = `${podPriceLabel(pod)} · Confirm with UPI`;
  const ctaSubtitle = pod.pod_type === 'FREE' ? 'Free spot' : paidSubtitle;

  const share = async () => {
    // The tracked pod link, so a reel passed on from Explore is measured — and
    // so the message carries a link at all, as mWeb's already did (rule 27).
    const url = await shareUrl('POD', pod.id, podWebUrl(pod));
    try {
      await Share.share({
        message: `${pod.pod_title} — join on Duncit\n${url}`,
        title: pod.pod_title,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <YStack width={width} height={height} backgroundColor="#000000" testID={`reel-${pod.pod_id}`}>
      <DoubleTapJoin onJoin={onOpen} testID={`reel-doubletap-${pod.pod_id}`}>
        <ReelBackdrop pod={pod} isActive={isActive} width={width} height={height} />
      </DoubleTapJoin>
      <ExplorePodOverlay
        pod={pod}
        clubName={club?.club_name}
        isVerified={club?.is_verified}
        onOpenClub={onOpenClub}
        bottom={contentBottom}
      />

      <YStack position="absolute" right={12} bottom={contentBottom}>
        <ExploreActionRail
          availableHeight={railAvailable}
          actions={[
            {
              key: 'join',
              testID: `reel-join-${pod.pod_id}`,
              icon: expired ? 'info-outline' : 'how-to-reg',
              label: joinLabel,
              caption: joinLabel,
              onPress: onOpen,
            },
            {
              key: 'like',
              testID: `reel-like-${pod.pod_id}`,
              icon: like.liked_by_me ? 'favorite' : 'favorite-border',
              label: String(like.like_count),
              caption: String(like.like_count),
              active: like.liked_by_me,
              onPress: onToggleLike,
              onLabelPress: like.like_count > 0 ? onShowLikers : undefined,
            },
            {
              key: 'comment',
              testID: `reel-comment-${pod.pod_id}`,
              icon: 'chat-bubble-outline',
              label: String(commentCount),
              caption: String(commentCount),
              onPress: onComment,
            },
            {
              key: 'save',
              testID: `reel-save-${pod.pod_id}`,
              icon: saved ? 'bookmark' : 'bookmark-border',
              label: t('mweb.explore.save'),
              active: saved,
              loading: savePending,
              onPress: onToggleSave,
            },
            {
              key: 'share',
              testID: `reel-share-${pod.pod_id}`,
              icon: 'share',
              label: t('mweb.common.share'),
              onPress: share,
            },
            {
              key: 'open',
              testID: `reel-open-${pod.pod_id}`,
              icon: 'open-in-new',
              label: t('mweb.explore.open'),
              onPress: onOpen,
            },
          ]}
        />
      </YStack>

      <ExploreJoinBar
        podId={pod.pod_id}
        expired={expired}
        subtitle={ctaSubtitle}
        bottom={ctaBottom}
        onGo={onOpen}
      />
    </YStack>
  );
}
