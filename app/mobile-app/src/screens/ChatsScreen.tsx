import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack } from 'tamagui';

import { ChatPodFilter, type ChatPodFilterValue } from '@/components/chat/ChatPodFilter';
import { ChatRoomCard } from '@/components/chat/ChatRoomCard';
import { FeedList } from '@/components/FeedList';
import { TabScreen } from '@/components/TabScreen';
import { useChatRooms } from '@/hooks/useChat';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { isPodActive } from '@/utils/pod-format';

/** Chats tab — the list of rooms (pods) the user is in. Rooms are classified by
 * the header Super Category (For You / For Your Pet) and can be narrowed to
 * Upcoming / Previous pods; the search box filters by pod title. Tapping opens
 * the room. RN twin of mWeb's ChatsPage. */
export function ChatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rooms, isLoading, refetch } = useChatRooms();
  const { selectedSuperId } = useSuperCategories();
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');
  const [podFilter, setPodFilter] = useState<ChatPodFilterValue>('ALL');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rooms.filter((room) => {
      if (selectedSuperId && room.super_category_id !== selectedSuperId) return false;
      if (podFilter === 'UPCOMING' && !isPodActive(room.pod_date_time, room.pod_end_date_time))
        return false;
      if (podFilter === 'PREVIOUS' && isPodActive(room.pod_date_time, room.pod_end_date_time))
        return false;
      if (needle && !(room.pod_title ?? '').toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rooms, query, selectedSuperId, podFilter]);

  const emptyText = rooms.length
    ? 'No chats match your filters.'
    : 'No chats yet. Join a pod to start chatting.';

  return (
    <TabScreen testID="chats-screen">
      <XStack
        alignItems="center"
        gap={8}
        marginHorizontal={16}
        marginTop={12}
        paddingHorizontal={12}
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID="chats-search-input"
          aria-label="Search chats"
          flex={1}
          unstyled
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats by pod name…"
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>
      <ChatPodFilter value={podFilter} onChange={setPodFilter} />
      <FeedList
        testID="chats-list"
        isLoading={isLoading}
        isEmpty={filtered.length === 0}
        emptyText={emptyText}
        onRefresh={refetch}
        data={filtered}
        keyExtractor={(room) => room.id}
        renderItem={(room) => (
          <ChatRoomCard
            room={room}
            onPress={() => {
              if (room.pod_id)
                navigation.navigate('ChatRoom', { podId: room.pod_id, title: room.pod_title });
            }}
          />
        )}
      />
    </TabScreen>
  );
}
