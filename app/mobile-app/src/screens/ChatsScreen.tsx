import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack } from 'tamagui';

import { ChatRoomCard } from '@/components/chat/ChatRoomCard';
import { FeedList } from '@/components/FeedList';
import { TabScreen } from '@/components/TabScreen';
import { useChatRooms } from '@/hooks/useChat';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Chats tab — the list of rooms (pods) the user is in, with a search box that
 * filters by pod title. Tapping opens a read-only room view. */
export function ChatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rooms, isLoading, refetch } = useChatRooms();
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rooms;
    return rooms.filter((room) => (room.pod_title ?? '').toLowerCase().includes(needle));
  }, [rooms, query]);

  const emptyText = rooms.length
    ? 'No chats match your search.'
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
