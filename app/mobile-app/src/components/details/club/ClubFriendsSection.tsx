import { useEffect, useState } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { Avatar, AvatarImage } from 'tamagui';
import { Text, XStack, YStack } from 'tamagui';
import { MaterialIcons } from '@expo/vector-icons';

import { graphqlRequest } from '@/services/graphql.client';
import { PodPeopleDocument } from '@/graphql/details';
import type { PodPerson } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  friendIds: string[];
  onOpenProfile: (userId: string) => void;
}

function useFriendProfiles(friendIds: string[]) {
  const [profiles, setProfiles] = useState<PodPerson[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (friendIds.length === 0) return;
    graphqlRequest(PodPeopleDocument, { ids: friendIds }, { auth: true })
      .then((r) => {
        setProfiles(r.publicUsersByIds);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [friendIds]);

  return { profiles, loaded };
}

export function ClubFriendsSection({ friendIds, onOpenProfile }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);
  const { profiles } = useFriendProfiles(friendIds);

  if (profiles.length === 0) return null;

  const preview = profiles.slice(0, 5);
  const firstLabel = profiles[0]?.full_name ?? 'Friend';
  const subtitle =
    profiles.length === 1 ? firstLabel : `${firstLabel} and ${profiles.length - 1} more`;

  return (
    <YStack gap={8} testID="club-friends">
      <Text fontSize={16} fontWeight="900" color="$color">
        Friends Here
      </Text>
      <XStack alignItems="center" gap={12}>
        <XStack>
          {preview.map((p, i) => (
            <XStack key={p.user_id} marginLeft={i === 0 ? 0 : -10} zIndex={preview.length - i}>
              <Avatar circular size={36} borderColor="$background" borderWidth={2}>
                <AvatarImage src={p.profile_photo ?? undefined} />
              </Avatar>
            </XStack>
          ))}
        </XStack>
        <YStack flex={1}>
          <Text fontSize={13} fontWeight="700" color="$color" numberOfLines={1}>
            {subtitle}
          </Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Text fontSize={12} fontWeight="700" color={primary}>
              View all
            </Text>
          </TouchableOpacity>
        </YStack>
      </XStack>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={20}
            maxHeight="70%"
          >
            <XStack alignItems="center" justifyContent="space-between" marginBottom={16}>
              <Text fontSize={17} fontWeight="900" color="$color">
                Friends in this club
              </Text>
              <TouchableOpacity testID="friends-modal-close" onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="gray" />
              </TouchableOpacity>
            </XStack>
            {profiles.map((p) => (
              <TouchableOpacity
                key={p.user_id}
                onPress={() => {
                  setModalVisible(false);
                  onOpenProfile(p.user_id);
                }}
              >
                <XStack alignItems="center" gap={12} paddingVertical={8}>
                  <Avatar circular size={40}>
                    <AvatarImage src={p.profile_photo ?? undefined} />
                  </Avatar>
                  <Text fontSize={14} fontWeight="700" color="$color">
                    {p.full_name}
                  </Text>
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>
        </YStack>
      </Modal>
    </YStack>
  );
}
