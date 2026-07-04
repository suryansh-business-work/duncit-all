import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ChatRoomCard } from '@/components/chat/ChatRoomCard';
import { FeedList } from '@/components/FeedList';
import { TabScreen } from '@/components/TabScreen';
import { useChatRooms } from '@/hooks/useChat';
import type { RootStackParamList } from '@/navigation/types';

/** Chats tab — the list of rooms (pods) the user is in. Tapping opens a
 * read-only room view; live messaging is a follow-up. */
export function ChatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rooms, isLoading, refetch } = useChatRooms();

  return (
    <TabScreen testID="chats-screen">
      <FeedList
        testID="chats-list"
        isLoading={isLoading}
        isEmpty={rooms.length === 0}
        emptyText="No chats yet. Join a pod to start chatting."
        onRefresh={refetch}
        data={rooms}
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
