import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack } from 'tamagui';

import { ChatPodFilter, type ChatPodFilterValue } from '@/components/chat/ChatPodFilter';
import { ChatRoomCard } from '@/components/chat/ChatRoomCard';
import { ChatTabs, type ChatTab } from '@/components/chat/ChatTabs';
import { ClubChatRoomCard } from '@/components/chat/ClubChatRoomCard';
import { FeedList } from '@/components/FeedList';
import { StackScreen } from '@/components/StackScreen';
import { useChatRooms } from '@/hooks/useChat';
import { useClubChatRooms } from '@/hooks/useClubChatRooms';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { isPodActive } from '@/utils/pod-format';
import { useTranslation } from '@/hooks/useTranslation';

/** Chats tab — a Pods tab (each pod's room, narrowed to Upcoming / Previous)
 * and a Clubs tab (each joined club's room). Rooms are classified by the
 * header Super Category (For You / For Your Pet); the search box filters by
 * pod or club name. Tapping opens the room. RN twin of mWeb's ChatsPage. */
export function ChatsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<ChatTab>('PODS');
  const { rooms, isLoading } = useChatRooms();
  const clubs = useClubChatRooms(tab === 'CLUBS');
  const { selectedSuperId } = useSuperCategories();
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');
  const [podFilter, setPodFilter] = useState<ChatPodFilterValue>('ALL');
  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return rooms.filter((room) => {
      if (selectedSuperId && room.super_category_id !== selectedSuperId) return false;
      if (podFilter === 'UPCOMING' && !isPodActive(room.pod_date_time, room.pod_end_date_time))
        return false;
      if (podFilter === 'PREVIOUS' && isPodActive(room.pod_date_time, room.pod_end_date_time))
        return false;
      if (needle && !(room.pod_title ?? '').toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rooms, needle, selectedSuperId, podFilter]);

  const filteredClubs = useMemo(
    () =>
      clubs.rooms.filter((room) => {
        if (selectedSuperId && room.super_category_id !== selectedSuperId) return false;
        return !needle || room.club_name.toLowerCase().includes(needle);
      }),
    [clubs.rooms, needle, selectedSuperId]
  );

  const isPods = tab === 'PODS';
  const podsEmpty = rooms.length ? t('mweb.chat.podsNoMatch') : t('mweb.chat.podsEmpty');
  const clubsEmpty = clubs.rooms.length ? t('mweb.chat.clubsNoMatch') : t('mweb.chat.clubsEmpty');

  return (
    <StackScreen title={t('mweb.nav.chats')} testID="chats-screen">
      <ChatTabs value={tab} onChange={setTab} />
      <XStack
        alignItems="center"
        gap={8}
        marginHorizontal={16}
        marginTop={12}
        paddingHorizontal={16}
        height={50}
        borderRadius={999}
        borderWidth={1}
        borderColor="$cardBorder"
        backgroundColor="$surface"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID="chats-search-input"
          aria-label={t('mweb.chats.searchChats')}
          flex={1}
          unstyled
          value={query}
          onChangeText={setQuery}
          placeholder={isPods ? t('mweb.chats.searchChatsByPodName') : t('mweb.chat.searchClubs')}
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>
      {isPods ? (
        <>
          <ChatPodFilter value={podFilter} onChange={setPodFilter} />
          <FeedList
            testID="chats-list"
            isLoading={isLoading}
            isEmpty={filtered.length === 0}
            emptyText={podsEmpty}
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
        </>
      ) : (
        <FeedList
          testID="club-chats-list"
          isLoading={clubs.isLoading}
          isEmpty={filteredClubs.length === 0}
          emptyText={clubs.error ?? clubsEmpty}
          data={filteredClubs}
          keyExtractor={(room) => room.id}
          renderItem={(room) => (
            <ClubChatRoomCard
              room={room}
              onPress={() => navigation.navigate('ChatRoom', { clubId: room.id, title: room.club_name })}
            />
          )}
        />
      )}
    </StackScreen>
  );
}
