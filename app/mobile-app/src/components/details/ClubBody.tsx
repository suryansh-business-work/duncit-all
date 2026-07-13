import { useMemo } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AttendeesSection, buildAttendeePeople } from '@/components/details/PodSections';
import { CategoryBreadcrumb } from '@/components/CategoryBreadcrumb';
import { ClubSegments } from '@/components/details/club/ClubSegments';
import { ClubFriendsSection } from '@/components/details/club/ClubFriendsSection';
import { ClubRatingSection } from '@/components/details/club/ClubRatingSection';
import type { ClubDetail, ClubPod, PodPerson } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FollowPillButton } from '@/components/FollowPillButton';
import { pickPodMoments } from '@/utils/club-detail';

function Stat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <YStack flex={1} alignItems="flex-start">
      <Text fontSize={18} fontWeight="900" color="$color">
        {value}
      </Text>
      <Text fontSize={12} fontWeight="700" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

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
}>) {
  const { onPrimary } = useThemeColors();
  const moments = useMemo(() => pickPodMoments(pods, 12), [pods]);
  const chatLinks = [
    { key: 'community', label: 'Community', href: club.club_whats_app_community_link },
    { key: 'group', label: 'Group chat', href: club.club_whats_app_group_link },
  ].filter((link) => link.href);

  const memberIds = useMemo(
    () => Array.from(new Set(pods.flatMap((pod) => pod.pod_attendees))),
    [pods],
  );
  const friendIds = useMemo(
    () => memberIds.filter((id) => followingUserIds.includes(id)),
    [memberIds, followingUserIds],
  );

  return (
    <YStack padding={16} gap={18}>
      <Text fontSize={24} fontWeight="900" color="$color">
        {club.club_name}
      </Text>
      <CategoryBreadcrumb crumbs={categoryCrumbs} />
      {club.club_description ? (
        <Text fontSize={14} color="$muted" lineHeight={20}>
          {club.club_description}
        </Text>
      ) : null}
      <FollowPillButton
        testID="club-follow"
        following={following}
        busy={followBusy}
        onToggle={onToggleFollow}
      />
      <XStack
        gap={8}
        padding={12}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <Stat value={club.followers_count ?? 0} label="followers" />
        <Stat value={members.length} label="members" />
        <Stat value={pods.length} label="pods" />
        <Stat value={moments.length} label="moments" />
        <Stat value={club.matched_venues_count} label="venues" />
      </XStack>
      {members.length > 0 ? (
        <YStack gap={8} testID="club-members">
          <Text fontSize={16} fontWeight="900" color="$color">
            Members
          </Text>
          <AttendeesSection
            people={buildAttendeePeople(
              members,
              members.map((member) => member.user_id),
              [],
            )}
            spots={0}
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
              pressStyle={{ opacity: 0.85 }}
            >
              <MaterialIcons name="chat" size={18} color={onPrimary} />
              <Text fontSize={14} fontWeight="900" color="$onPrimary">
                {link.label}
              </Text>
            </XStack>
          ))}
        </XStack>
      ) : null}
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
