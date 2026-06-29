import { useEffect, useState } from 'react';
import { FlatList, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { PodLikersDocument } from '@/graphql/explore';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

type Liker = ResultOf<typeof PodLikersDocument>['publicUsersByIds'][number];

interface Props {
  open: boolean;
  userIds: string[];
  onClose: () => void;
}

/** "Who liked this pod" — tap the like count to open this, tap a person to open
 * their public profile (explore item 8). */
export function LikesListSheet({ open, userIds, onClose }: Readonly<Props>) {
  const { color } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || userIds.length === 0) {
      setLikers([]);
      return undefined;
    }
    let active = true;
    setIsLoading(true);
    graphqlRequest(PodLikersDocument, { ids: userIds }, { auth: true })
      .then((data) => {
        if (active) setLikers(data.publicUsersByIds);
      })
      .catch(() => {
        if (active) setLikers([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, userIds]);

  const openProfile = (userId: string) => {
    onClose();
    navigation.navigate('PublicProfile', { userId });
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} testID="likes-sheet">
          <YStack
            role="button"
            aria-label="Close"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            height="60%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
              <XStack
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal={16}
                paddingTop={16}
                paddingBottom={8}
              >
                <Text fontSize={18} fontWeight="900" color="$color">
                  Liked by
                </Text>
                <XStack
                  testID="likes-close"
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>

              {isLoading ? (
                <YStack flex={1} alignItems="center" justifyContent="center">
                  <Spinner color="$primary" />
                </YStack>
              ) : likers.length === 0 ? (
                <Text padding={16} color="$muted" testID="likes-empty">
                  No likes yet.
                </Text>
              ) : (
                <FlatList<Liker>
                  style={{ flex: 1 }}
                  data={likers}
                  keyExtractor={(u) => u.user_id}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                  renderItem={({ item }) => (
                    <XStack
                      testID={`liker-${item.user_id}`}
                      role="button"
                      aria-label={item.full_name ?? 'User'}
                      onPress={() => openProfile(item.user_id)}
                      alignItems="center"
                      gap={12}
                      paddingVertical={10}
                    >
                      {item.profile_photo ? (
                        <Image
                          source={{ uri: item.profile_photo }}
                          style={{ width: 44, height: 44, borderRadius: 22 }}
                        />
                      ) : (
                        <YStack
                          width={44}
                          height={44}
                          borderRadius={22}
                          backgroundColor="$muted"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <MaterialIcons name="person" size={24} color="#ffffff" />
                        </YStack>
                      )}
                      <YStack flex={1}>
                        <Text fontSize={14} fontWeight="800" color="$color" numberOfLines={1}>
                          {item.full_name || item.first_name || 'User'}
                        </Text>
                        {item.username ? (
                          <Text fontSize={12} color="$muted" numberOfLines={1}>
                            @{item.username}
                          </Text>
                        ) : null}
                      </YStack>
                    </XStack>
                  )}
                />
              )}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
