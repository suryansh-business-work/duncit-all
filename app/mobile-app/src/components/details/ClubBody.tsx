import { useMemo } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AttendeesSection, buildAttendeePeople } from '@/components/details/PodSections';
import { CategoryBreadcrumb } from '@/components/CategoryBreadcrumb';
import { ClubSegments } from '@/components/details/club/ClubSegments';
import { ClubFriendsSection } from '@/components/details/club/ClubFriendsSection';
import { ClubMeetupVenuesSection } from '@/components/details/club/ClubMeetupVenuesSection';
import { ClubRatingSection } from '@/components/details/club/ClubRatingSection';
import { ClubStoriesRail } from '@/components/details/club/ClubStoriesRail';
import type { ClubDetail, ClubPod, PodPerson } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FollowPillButton } from '@/components/FollowPillButton';
import { TourAnchor } from '@/tours/TourAnchor';
import { pickPodMoments } from '@/utils/club-detail';
import { isClubAdminOf } from '@duncit/utils';
import { useMeStore } from '@/stores/me.store';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The club-details body — summary, stats, WhatsApp chat, members and the
 * tabbed segments (pods schedule, moments, content sections, hosts). */
export function ClubBody({
  club,
  pods,
  members,
  followingUserIds,
  categoryCrumbs,
  following,
  followBusy,
  onToggleFollow,
  onOpenPod,
  onOpenMember,
  onOpenVenue,
}: Readonly<{
  club: ClubDetail;
  pods: ClubPod[];
  members: PodPerson[];
  followingUserIds: string[];
  categoryCrumbs: readonly string[];
  following: boolean;
  followBusy: boolean;
  onToggleFollow: () => void;
  onOpenPod: (pod: ClubPod) => void;
  onOpenMember: (userId: string) => void;
  onOpenVenue: (venueId: string) => void;
}>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const viewerId = useMeStore((s) => s.data?.me?.user_id);
  const moments = useMemo(() => pickPodMoments(pods, 12), [pods]);
  const chatLinks = [
    {
      key: 'community',
      label: t('mweb.common.community'),
      href: club.club_whats_app_community_link,
    },
    { key: 'group', label: t('mweb.common.groupChat'), href: club.club_whats_app_group_link },
  ].filter((link) => link.href);

  const memberIds = useMemo(
    () => Array.from(new Set(pods.flatMap((pod) => pod.pod_attendees))),
    [pods],
  );
  const friendIds = useMemo(
    () => memberIds.filter((id) => followingUserIds.includes(id)),
    [memberIds, followingUserIds],
  );
  // A club story speaks for the club, so only its admins may post one. The
  // server refuses everyone else either way; this decides whether the Add tile
  // is drawn at all. Shared with mWeb so they cannot answer it differently.
  const canPostStory = isClubAdminOf(club.club_admins, viewerId);

  return (
    <YStack padding={16} gap={18}>
      {/* Folding three siblings into one child hands the parent's gap to the
          wrapper, so it is restated here or the block sits flush mid-tour. */}
      <TourAnchor tour="club" anchor="club-header" style={{ gap: 18 }}>
        <Text fontSize={24} fontWeight="700" color="$color">
          {club.club_name}
        </Text>
        <CategoryBreadcrumb crumbs={categoryCrumbs} />
        {club.club_description ? (
          <Text fontSize={14} color="$muted" lineHeight={20}>
            {club.club_description}
          </Text>
        ) : null}
      </TourAnchor>
      <TourAnchor tour="club" anchor="club-follow" style={{ alignSelf: 'flex-start' }}>
        <FollowPillButton
          testID="club-follow"
          following={following}
          busy={followBusy}
          onToggle={onToggleFollow}
        />
      </TourAnchor>
      {/* Ephemeral 24h club stories + the "Add" tile — mirrors mWeb, which
          places this directly under the club summary header. */}
      <ClubStoriesRail clubId={club.id} clubName={club.club_name} canPost={canPostStory} />
      {/* The follower/pod/moment/venue counts that used to sit here are gone,
          along with the follower card under them: a brand new club read
          "0 total members" as its loudest line, which is the worst possible
          first impression of a page whose job is to recruit. Who is actually
          in the club is answered by Club Members below — real people, from
          real pods. mWeb twin (rule 27). */}
      {members.length > 0 ? (
        <YStack gap={8} testID="club-members">
          <Text fontSize={16} fontWeight="700" color="$color">
            Club Members
          </Text>
          <AttendeesSection
            people={buildAttendeePeople(
              members,
              members.map((member) => member.user_id),
              [],
            )}
            spots={0}
            showCount={false}
            onOpenProfile={onOpenMember}
          />
        </YStack>
      ) : null}
      <ClubFriendsSection friendIds={friendIds} onOpenProfile={onOpenMember} />
      <ClubRatingSection
        clubId={club.id}
        rating={club.rating ?? 0}
        ratingsCount={club.ratings_count ?? 0}
      />
      {chatLinks.length > 0 ? (
        <XStack gap={8} flexWrap="wrap">
          {chatLinks.map((link) => (
            <XStack
              key={link.key}
              testID={`club-chat-${link.key}`}
              role="button"
              aria-label={`Open ${link.label} on WhatsApp`}
              onPress={() => Linking.openURL(link.href as string)}
              alignItems="center"
              justifyContent="center"
              gap={8}
              flex={1}
              minWidth={140}
              height={48}
              borderRadius={14}
              backgroundColor="$primary"
              pressStyle={PRESS_STYLE.control}
            >
              <MaterialIcons name="chat" size={18} color={onPrimary} />
              <Text fontSize={14} fontWeight="700" color="$onPrimary">
                {link.label}
              </Text>
            </XStack>
          ))}
        </XStack>
      ) : null}
      <ClubMeetupVenuesSection venues={club.matched_venues} onOpenVenue={onOpenVenue} />
      <ClubSegments
        club={club}
        pods={pods}
        moments={moments}
        onOpenPod={onOpenPod}
        onOpenHost={onOpenMember}
      />
    </YStack>
  );
}
