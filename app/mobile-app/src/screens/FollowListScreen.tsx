import { useState } from 'react';
import { Image } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { FeedList } from '@/components/FeedList';
import { FollowPillButton } from '@/components/FollowPillButton';
import { StackScreen } from '@/components/StackScreen';
import { useFollowList, type FollowListPerson, type FollowTab } from '@/hooks/useFollowList';
import { useMe } from '@/hooks/useMe';
import type { RootStackParamList } from '@/navigation/types';

const TABS: FollowTab[] = ['followers', 'following'];
const TAB_LABELS: Record<FollowTab, string> = { followers: 'Followers', following: 'Following' };

interface RowProps {
  person: FollowListPerson;
  isSelf: boolean;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

/** One person in the follow list — avatar, name, @handle and a follow toggle. */
function FollowRow({ person, isSelf, busy, onToggle, onOpen }: Readonly<RowProps>) {
  const initial = (person.full_name?.[0] ?? person.first_name?.[0] ?? '?').toUpperCase();
  return (
    <XStack
      testID={`follow-row-${person.user_id}`}
      alignItems="center"
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack
        testID={`follow-open-${person.user_id}`}
        role="button"
        aria-label={`Open ${person.full_name ?? 'profile'}`}
        onPress={onOpen}
        alignItems="center"
        gap={12}
        flex={1}
        pressStyle={{ opacity: 0.85 }}
      >
        {person.profile_photo ? (
          <Image
            source={{ uri: person.profile_photo }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
        ) : (
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={16} fontWeight="900" color="$onPrimary">
              {initial}
            </Text>
          </YStack>
        )}
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="800" color="$color" numberOfLines={1}>
            {person.full_name || person.first_name || 'Duncit user'}
          </Text>
          <Text fontSize={12.5} color="$muted" numberOfLines={1}>
            @{person.username}
          </Text>
        </YStack>
      </XStack>
      {isSelf ? null : (
        <FollowPillButton
          testID={`follow-toggle-${person.user_id}`}
          following={person.is_following}
          busy={busy}
          onToggle={onToggle}
        />
      )}
    </XStack>
  );
}

/** Followers / Following list for a profile (bug 9). Opens from the
 * followers/following counts; rows deep-link to each person's public profile. */
export function FollowListScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Follow'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<FollowTab>(params.tab);
  const { people, isLoading, busyId, toggle } = useFollowList(params.userId, tab);
  const myId = useMe().data?.me?.user_id;

  return (
    <StackScreen title="Connections" testID="follow-list-screen">
      <XStack gap={8} paddingHorizontal={16} paddingTop={8} paddingBottom={4}>
        {TABS.map((value) => {
          const selected = tab === value;
          return (
            <XStack
              key={value}
              testID={`follow-tab-${value}`}
              role="button"
              aria-pressed={selected}
              onPress={() => setTab(value)}
              flex={1}
              height={38}
              alignItems="center"
              justifyContent="center"
              borderRadius={12}
              backgroundColor={selected ? '$primary' : '$surface'}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13} fontWeight="900" color={selected ? '$onPrimary' : '$color'}>
                {TAB_LABELS[value]}
              </Text>
            </XStack>
          );
        })}
      </XStack>
      <FeedList
        testID="follow-list"
        isLoading={isLoading}
        isEmpty={people.length === 0}
        emptyText={tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
      >
        {people.map((person) => (
          <FollowRow
            key={person.user_id}
            person={person}
            isSelf={person.user_id === myId}
            busy={busyId === person.user_id}
            onToggle={() => void toggle(person)}
            onOpen={() => navigation.navigate('PublicProfile', { userId: person.user_id })}
          />
        ))}
      </FeedList>
    </StackScreen>
  );
}
