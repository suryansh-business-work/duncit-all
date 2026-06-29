import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import { PodCard } from '@/components/home/PodCard';
import { useClubFollow } from '@/hooks/useFollow';
import type { SearchClubResult } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

type SearchPod = SearchClubResult['upcoming_pods'][number];

interface Props {
  result: SearchClubResult;
  categoryName: string | null;
  onOpenClub: (clubId: string, title: string) => void;
  onOpenPod: (pod: SearchPod) => void;
}

const followersText = (n: number) => `${n.toLocaleString('en-IN')} follower${n === 1 ? '' : 's'}`;

/** A club surfaced by search — avatar, name, category, follower count, a Follow
 * CTA (hidden once followed) and a horizontal rail of its upcoming pods. */
export function SearchClubCard({ result, categoryName, onOpenClub, onOpenPod }: Readonly<Props>) {
  const { primary, onPrimary, muted } = useThemeColors();
  const { following, busy, toggle } = useClubFollow(result.club.id, result.is_following);
  const { club, upcoming_pods: pods } = result;
  const image = club.club_feature_images_and_videos.find((m) => !!m.url)?.url ?? null;
  const followers = club.followers_count + ((following ? 1 : 0) - (result.is_following ? 1 : 0));

  let body: ReactNode = null;
  if (pods.length > 0) {
    body = (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={12} paddingVertical={2}>
          {pods.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              width={260}
              showPlace={false}
              onPress={() => onOpenPod(pod)}
            />
          ))}
        </XStack>
      </ScrollView>
    );
  } else if (club.club_description) {
    body = (
      <Text fontSize={13} color="$muted" numberOfLines={2}>
        {club.club_description}
      </Text>
    );
  }

  return (
    <YStack gap={10} testID={`search-club-${club.club_id}`}>
      <XStack alignItems="center" gap={12}>
        <PressScale
          accessibilityLabel={club.club_name}
          onPress={() => onOpenClub(club.id, club.club_name)}
        >
          <XStack alignItems="center" gap={12} flex={1}>
            <YStack
              width={52}
              height={52}
              borderRadius={16}
              overflow="hidden"
              backgroundColor="$primary"
              alignItems="center"
              justifyContent="center"
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="groups" size={26} color={onPrimary} />
              )}
            </YStack>
            <YStack flex={1} gap={2}>
              <Text
                fontSize={15.5}
                fontWeight="900"
                color="$color"
                numberOfLines={1}
                textAlign="left"
              >
                {club.club_name}
              </Text>
              <XStack alignItems="center" gap={8} flexWrap="wrap">
                {categoryName ? (
                  <Text fontSize={12} fontWeight="800" color="$primary">
                    {categoryName}
                  </Text>
                ) : null}
                <XStack alignItems="center" gap={3}>
                  <MaterialIcons name="people" size={13} color={muted} />
                  <Text fontSize={12} fontWeight="700" color="$muted">
                    {followersText(followers)}
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </XStack>
        </PressScale>
        {following ? (
          <XStack
            testID={`search-following-${club.club_id}`}
            alignItems="center"
            gap={4}
            height={32}
            paddingHorizontal={12}
            borderRadius={999}
            backgroundColor="$primary"
            justifyContent="center"
          >
            <MaterialIcons name="check" size={15} color={onPrimary} />
            <Text fontSize={12.5} fontWeight="900" color="$onPrimary">
              Following
            </Text>
          </XStack>
        ) : (
          <XStack
            testID={`search-follow-${club.club_id}`}
            role="button"
            aria-label={`Follow ${club.club_name}`}
            onPress={toggle}
            disabled={busy}
            opacity={busy ? 0.6 : 1}
            alignItems="center"
            gap={4}
            height={32}
            paddingHorizontal={12}
            borderRadius={999}
            borderWidth={1.5}
            borderColor="$primary"
            justifyContent="center"
            pressStyle={{ opacity: 0.85 }}
          >
            <MaterialIcons name="add" size={15} color={primary} />
            <Text fontSize={12.5} fontWeight="900" color="$primary">
              Follow
            </Text>
          </XStack>
        )}
      </XStack>
      {body}
    </YStack>
  );
}
