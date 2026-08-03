import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, Text, XStack, YStack } from 'tamagui';

import { FollowClubDocument } from '@/graphql/following';
import { graphqlRequest } from '@/services/graphql.client';
import { useFollowingStore } from '@/stores/following.store';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import type { HomeClub } from '@/hooks/useHomeFeed';

interface Props {
  clubs: HomeClub[];
  onOpenClub: (club: HomeClub) => void;
}

/**
 * Random club recommendation (mock: "The Smashers United · Join Club"). One
 * club is picked at random per visit — preferring clubs the viewer doesn't
 * follow yet — and Join follows it in place. Tamagui twin of mWeb's row.
 */
export function ClubRecommendationRow({ clubs, onOpenClub }: Readonly<Props>) {
  const { primary, onPrimary } = useThemeColors();
  const { t } = useTranslation();
  // Followed ids come from the same store the Following tab reads, so a join
  // here flips that tab too.
  const followingData = useFollowingStore((s) => s.data);
  const refreshFollowing = useFollowingStore((s) => s.fetch);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    refreshFollowing();
  }, [refreshFollowing]);
  const followedIds = useMemo(
    () => new Set(followingData?.me?.following_club_ids ?? []),
    [followingData?.me?.following_club_ids],
  );
  const isFollowing = useCallback((id: string) => followedIds.has(id), [followedIds]);
  const follow = useCallback(
    (id: string) => {
      setBusy(true);
      fireAndForget(
        graphqlRequest(FollowClubDocument, { clubId: id }, { auth: true })
          .then(() => refreshFollowing(true))
          .finally(() => setBusy(false)),
      );
    },
    [refreshFollowing],
  );

  // Stable per mount: the id is rolled once and re-resolved on refetches, so a
  // background refresh never swaps the recommendation mid-view.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const club = useMemo(() => {
    const byId = pickedId ? clubs.find((c) => c.id === pickedId) : null;
    if (byId) return byId;
    if (clubs.length === 0) return null;
    const fresh = clubs.filter((c) => !isFollowing(c.id));
    const pool = fresh.length > 0 ? fresh : clubs;
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) setPickedId(next.id);
    return next ?? null;
    // isFollowing is deliberately absent: a follow must not re-roll the pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, pickedId]);

  if (!club) return null;

  const image = club.club_feature_images_and_videos?.find((m) => m.type !== 'VIDEO')?.url;
  const members = (club as { followers_count?: number }).followers_count ?? 0;
  let membersLabel = '';
  if (members === 1) membersLabel = t('mweb.home.membersOne');
  else if (members > 1) membersLabel = t('mweb.home.membersMany', { count: members });
  const city = (club as { locality?: string | null }).locality ?? '';
  const meta = [city, membersLabel].filter(Boolean).join(' · ');
  const joined = isFollowing(club.id);
  const verified = (club as { is_verified?: boolean }).is_verified === true;

  return (
    <XStack
      testID="club-recommendation"
      role="button"
      aria-label={club.club_name}
      onPress={() => onOpenClub(club)}
      marginHorizontal={16}
      alignItems="center"
      gap={10}
      padding={10}
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <Avatar circular size={44}>
        {image ? <Avatar.Image src={image} /> : null}
        <Avatar.Fallback backgroundColor={primary} alignItems="center" justifyContent="center">
          <Text color={onPrimary} fontSize={16} fontWeight="700">
            {club.club_name?.[0]?.toUpperCase() ?? 'C'}
          </Text>
        </Avatar.Fallback>
      </Avatar>
      <YStack flex={1} minWidth={0}>
        <XStack alignItems="center" gap={4} minWidth={0}>
          <Text fontSize={13.5} fontWeight="700" color="$color" numberOfLines={1} flexShrink={1}>
            {club.club_name}
          </Text>
          {verified ? <MaterialIcons name="verified" size={14} color={primary} /> : null}
        </XStack>
        {meta ? (
          <Text fontSize={11.5} fontWeight="600" color="$muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </YStack>
      <XStack
        testID="club-recommendation-join"
        role="button"
        aria-label={joined ? t('mweb.home.joinedClub') : t('mweb.home.joinClub')}
        aria-disabled={joined || busy}
        onPress={() => {
          if (!joined && !busy) follow(club.id);
        }}
        borderRadius={999}
        borderWidth={1.5}
        borderColor={joined ? '$borderColor' : '$primary'}
        paddingHorizontal={13}
        paddingVertical={7}
        opacity={joined || busy ? 0.6 : 1}
        pressStyle={{ opacity: 0.7 }}
      >
        <Text fontSize={12} fontWeight="700" color={joined ? '$muted' : '$primary'}>
          {joined ? t('mweb.home.joinedClub') : t('mweb.home.joinClub')}
        </Text>
      </XStack>
    </XStack>
  );
}
