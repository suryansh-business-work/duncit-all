import { Modal, ScrollView } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface AttendeePerson {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
  is_host: boolean;
}

/** One filled Backout seat, already resolved to display copy by the section —
 * computed once in the parent so both surfaces render identical rows. */
export interface SpotFillRow {
  key: string;
  old_user_id: string;
  old_name: string;
  old_photo: string | null;
  filled_by_label: string;
}

interface Props {
  open: boolean;
  people: AttendeePerson[];
  spotFills?: SpotFillRow[];
  spotFilledTitle?: string;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

/** One attendee row — photo, name, host badge, tap-through to the profile. */
function AttendeeRow({
  person,
  onPress,
}: Readonly<{ person: AttendeePerson; onPress: () => void }>) {
  return (
    <XStack
      testID={`attendee-row-${person.user_id}`}
      role="button"
      aria-label={person.full_name || 'Attendee'}
      onPress={onPress}
      alignItems="center"
      gap={12}
      padding={10}
      borderRadius={12}
      pressStyle={{ opacity: 0.8, backgroundColor: '$surface' }}
    >
      {person.profile_photo ? (
        <AppImage
          source={{ uri: person.profile_photo }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
      ) : (
        <YStack
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          backgroundColor="$primary"
        >
          <Text fontSize={15} fontWeight="600" color="$onPrimary">
            {(person.full_name?.[0] ?? '?').toUpperCase()}
          </Text>
        </YStack>
      )}
      <YStack flex={1}>
        <Text
          fontSize={14}
          fontWeight={person.is_host ? '700' : '600'}
          color="$color"
          numberOfLines={1}
        >
          {person.full_name || 'Attendee'}
        </Text>
        <Text fontSize={11.5} color="$muted">
          View profile
        </Text>
      </YStack>
      {person.is_host ? (
        <YStack
          borderRadius={999}
          backgroundColor="$primary"
          paddingHorizontal={10}
          paddingVertical={3}
        >
          <Text fontSize={11} fontWeight="700" color="$onPrimary">
            Host
          </Text>
        </YStack>
      ) : null}
    </XStack>
  );
}

/** One struck-through former attendee whose seat a replacement rebooked. */
function SpotFillRowItem({ fill, onPress }: Readonly<{ fill: SpotFillRow; onPress: () => void }>) {
  return (
    <XStack
      testID={`spot-fill-row-${fill.key}`}
      role="button"
      aria-label={fill.old_name}
      onPress={onPress}
      alignItems="center"
      gap={12}
      padding={10}
      borderRadius={12}
      pressStyle={{ opacity: 0.8, backgroundColor: '$surface' }}
    >
      {fill.old_photo ? (
        <AppImage
          source={{ uri: fill.old_photo }}
          style={{ width: 40, height: 40, borderRadius: 20, opacity: 0.6 }}
        />
      ) : (
        <YStack
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          backgroundColor="$surface"
        >
          <Text fontSize={15} fontWeight="600" color="$muted">
            {fill.old_name.charAt(0).toUpperCase()}
          </Text>
        </YStack>
      )}
      <YStack flex={1}>
        <Text
          fontSize={14}
          fontWeight="700"
          color="$muted"
          textDecorationLine="line-through"
          numberOfLines={1}
        >
          {fill.old_name}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {fill.filled_by_label}
        </Text>
      </YStack>
    </XStack>
  );
}

/** Full attendees list — photos, host highlight, tap-through to profiles (3).
 * Filled Backout seats render struck-through with the replacement named. */
export function AttendeesDialog({
  open,
  people,
  spotFills = [],
  spotFilledTitle = '',
  onClose,
  onOpenProfile,
}: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="attendees-dialog">
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
            width="90%"
            maxWidth={440}
            maxHeight="80%"
            backgroundColor="$background"
            borderRadius={20}
            padding={14}
          >
            <SafeAreaView edges={[]}>
              <XStack alignItems="center" justifyContent="space-between" paddingBottom={8}>
                <Text fontSize={16} fontWeight="700" color="$color">
                  Attendees ({people.length})
                </Text>
                <XStack
                  testID="attendees-dialog-close"
                  role="button"
                  aria-label="Close attendees"
                  onPress={onClose}
                  width={34}
                  height={34}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={17}
                  backgroundColor="$surface"
                  pressStyle={{ opacity: 0.7 }}
                >
                  <MaterialIcons name="close" size={18} color={ink} />
                </XStack>
              </XStack>
              <ScrollView showsVerticalScrollIndicator={false}>
                {people.length === 0 ? (
                  <Text testID="attendees-dialog-empty" fontSize={13} color="$muted" padding={10}>
                    No attendees yet.
                  </Text>
                ) : (
                  people.map((person) => (
                    <AttendeeRow
                      key={person.user_id}
                      person={person}
                      onPress={() => onOpenProfile(person.user_id)}
                    />
                  ))
                )}
                {spotFills.length > 0 ? (
                  <YStack paddingTop={6} gap={2}>
                    <Text fontSize={11.5} fontWeight="600" color="$muted" paddingHorizontal={10}>
                      {spotFilledTitle}
                    </Text>
                    {spotFills.map((fill) => (
                      <SpotFillRowItem
                        key={fill.key}
                        fill={fill}
                        onPress={() => onOpenProfile(fill.old_user_id)}
                      />
                    ))}
                  </YStack>
                ) : null}
              </ScrollView>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
