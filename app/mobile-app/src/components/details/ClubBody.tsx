import { useMemo, type ReactNode } from 'react';
import { Linking } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AttendeesSection, buildAttendeePeople } from '@/components/details/PodSections';
import { CategoryBreadcrumb } from '@/components/CategoryBreadcrumb';
import { ClubSegments } from '@/components/details/club/ClubSegments';
import { ClubFriendsSection } from '@/components/details/club/ClubFriendsSection';
import { ClubMeetupVenuesSection } from '@/components/details/club/ClubMeetupVenuesSection';
import { ClubRatingSection } from '@/components/details/club/ClubRatingSection';
import { ClubStoriesRail } from '@/components/details/club/ClubStoriesRail';
import type { ClubDetail, ClubPod, PodPerson } from '@/hooks/useDetails';
import { FollowPillButton } from '@/components/FollowPillButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TwoToneHeading } from '@/components/TwoToneHeading';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import { pickPodMoments } from '@/utils/club-detail';
import { isClubAdminOf } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useMeStore } from '@/stores/me.store';

interface ChatLinkCandidate {
  key: string;
  label: string;
  href?: string | null;
  icon: ReactNode;
}

type ChatLink = ChatLinkCandidate & { href: string };

/** The club's WhatsApp community and group chat as surface pills. mWeb twin:
 * club-details-page/ClubSocialLinks. */
function ClubSocialLinks({ club }: Readonly<{ club: ClubDetail }>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const candidates: ChatLinkCandidate[] = [
    {
      key: 'community',
      label: t('mweb.common.community'),
      href: club.club_whats_app_community_link,
      icon: <Ionicons name="logo-whatsapp" size={18} color={color} />,
    },
    {
      key: 'group',
      label: t('mweb.common.groupChat'),
      href: club.club_whats_app_group_link,
      icon: <MaterialIcons name="chat" size={18} color={color} />,
    },
  ];
  const links = candidates.filter((link): link is ChatLink => !!link.href);
  if (links.length === 0) return null;

  return (
    <XStack gap={8} flexWrap="wrap">
      {links.map((link) => (
        <XStack
          key={link.key}
          testID={`club-chat-${link.key}`}
          role="button"
          aria-label={`Open ${link.label} on WhatsApp`}
          onPress={() => Linking.openURL(link.href)}
          alignItems="center"
          gap={8}
          height={44}
          paddingHorizontal={18}
          borderRadius={999}
          borderWidth={1}
          borderColor="$cardBorder"
          backgroundColor="$surface"
          pressStyle={PRESS_STYLE.control}
        >
          {link.icon}
          <Text fontSize={14} fontWeight="600" color="$color">
            {link.label}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}

/** The club-details body — the summary card, stories, WhatsApp chats, members
 * and the tabbed segments (pods schedule, moments, content sections, hosts).
 * mWeb twin: ClubDetailsPage's body, section for section. */
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
  const viewerId = useMeStore((s) => s.data?.me?.user_id);
  const moments = useMemo(() => pickPodMoments(pods, 12), [pods]);

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
    <YStack padding={16} gap={20}>
      {/* Identity and the one thing to do about it, on one surface card. The
          description reads once, here — there is no separate About block. */}
      <SurfaceCard gap={16}>
        {/* Folding three siblings into one child hands the parent's gap to the
            wrapper, so it is restated here or the block sits flush mid-tour. */}
        <TourAnchor tour="club" anchor="club-header" style={{ gap: 6 }}>
          <TwoToneHeading lead={club.club_name} />
          <CategoryBreadcrumb crumbs={categoryCrumbs} />
          {club.club_description ? (
            <Text fontSize={14} color="$muted" lineHeight={20} paddingTop={4}>
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
      </SurfaceCard>
      {/* Ephemeral 24h club stories + the "Add" tile — directly under the club
          summary, as on mWeb. */}
      <ClubStoriesRail clubId={club.id} clubName={club.club_name} canPost={canPostStory} />
      <ClubSocialLinks club={club} />
      {/* Who is actually in the club — real people, from real pods — rather
          than a follower count. mWeb twin (rule 27). */}
      {members.length > 0 ? (
        <SurfaceCard gap={12} testID="club-members">
          <SectionHeader title="Club Members" />
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
        </SurfaceCard>
      ) : null}
      <ClubFriendsSection friendIds={friendIds} onOpenProfile={onOpenMember} />
      <ClubRatingSection
        clubId={club.id}
        rating={club.rating ?? 0}
        ratingsCount={club.ratings_count ?? 0}
      />
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
