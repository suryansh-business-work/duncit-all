import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { MobileClubFollowersDocument } from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';

type Person = {
  user_id: string;
  username: string;
  full_name?: string | null;
  first_name?: string | null;
  profile_photo?: string | null;
};

interface Props {
  open: boolean;
  clubId: string;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

/** The people behind the club's Total Members count. The count was previously a
 * dead number — you could see how many, never who. Twin of mWeb's
 * <ClubFollowersDialog/> (rule 27). */
export function ClubFollowersSheet({ open, clubId, onClose, onOpenProfile }: Readonly<Props>) {
  const { color: ink, muted } = useThemeColors();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !clubId) return;
    setLoading(true);
    graphqlRequest(MobileClubFollowersDocument, { clubId }, { auth: true })
      .then((d) => setPeople((d.clubFollowers ?? []) as Person[]))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  }, [open, clubId]);

  let body;
  if (loading && people.length === 0) {
    body = <Spinner testID="club-followers-loading" color="$primary" />;
  } else if (people.length === 0) {
    body = (
      <Text fontSize={13} color="$muted" paddingVertical={20} textAlign="center">
        No members yet.
      </Text>
    );
  } else {
    body = people.map((person) => {
      const name = person.full_name || person.first_name || 'Duncit user';
      return (
        <XStack
          key={person.user_id}
          testID={`club-follower-${person.user_id}`}
          role="button"
          aria-label={name}
          onPress={() => onOpenProfile(person.user_id)}
          alignItems="center"
          gap={12}
          paddingVertical={8}
          pressStyle={{ opacity: 0.8 }}
        >
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            overflow="hidden"
            backgroundColor="$surface"
            alignItems="center"
            justifyContent="center"
          >
            {person.profile_photo ? (
              <AppImage
                source={{ uri: person.profile_photo }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text fontSize={16} fontWeight="700" color="$muted">
                {name.slice(0, 1).toUpperCase()}
              </Text>
            )}
          </YStack>
          <YStack flex={1}>
            <Text fontSize={14} fontWeight="700" color="$color" numberOfLines={1}>
              {name}
            </Text>
            <Text fontSize={12} color="$muted" numberOfLines={1}>
              @{person.username}
            </Text>
          </YStack>
        </XStack>
      );
    });
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" backgroundColor="rgba(0,0,0,0.6)">
          <YStack
            testID="club-followers-sheet"
            maxHeight="82%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={18}
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" paddingBottom={10}>
                <Text flex={1} fontSize={17} fontWeight="700" color="$color">
                  Total Members
                </Text>
                <XStack
                  testID="club-followers-close"
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <MaterialIcons name="close" size={20} color={ink} />
                </XStack>
              </XStack>
              <ScrollView
                style={{ flexGrow: 0 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <YStack>{body}</YStack>
              </ScrollView>
              <Text fontSize={11} color={muted} paddingTop={4}>
                People following this club
              </Text>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
