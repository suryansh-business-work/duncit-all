import { Modal, ScrollView } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { attendeeSeatCount } from '@duncit/utils';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AttendeeRow, SpotFillRowItem } from './AttendeeRows';
import { otherMembersLabel, type AttendeePerson, type SpotFillRow } from './attendees';

interface Props {
  open: boolean;
  people: AttendeePerson[];
  spotFills?: SpotFillRow[];
  spotFilledTitle?: string;
  /**
   * Seats the list holds, resolved by the section that owns the pod. The
   * heading counts PEOPLE COMING, not rows: a booking for three is one row
   * carrying a "+2 other members" label. Absent (a club members list) the
   * rows are the count.
   */
  seatCount?: number;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

/** Full attendees list — photos, host highlight, tap-through to profiles (3).
 * Filled Backout seats render struck-through with the replacement named. */
export function AttendeesDialog({
  open,
  people,
  spotFills = [],
  spotFilledTitle = '',
  seatCount,
  onClose,
  onOpenProfile,
}: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();
  const count = seatCount ?? attendeeSeatCount(people);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="attendees-dialog">
          <YStack
            pressStyle={PRESS_STYLE.surface}
            role="button"
            importantForAccessibility="no"
            aria-label={t('mweb.podDetails.close')}
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
            backgroundColor="$surface"
            borderRadius={28}
            padding={16}
          >
            <ModalSafeArea edges={[]} style={SHEET_SAFE_AREA}>
              <XStack alignItems="center" justifyContent="space-between" paddingBottom={8}>
                <Text role="heading" fontSize={17} fontWeight="600" color="$color">
                  {t('mweb.podDetails.attendeesCount', { vars: { count } })}
                </Text>
                <XStack
                  testID="attendees-dialog-close"
                  role="button"
                  tabIndex={0}
                  aria-label={t('mweb.podDetails.closeAttendees')}
                  hitSlop={4}
                  onPress={onClose}
                  width={36}
                  height={36}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={18}
                  backgroundColor="$soft"
                  pressStyle={PRESS_STYLE.row}
                >
                  <MaterialIcons name="close" size={18} color={ink} />
                </XStack>
              </XStack>
              <ScrollView showsVerticalScrollIndicator={false}>
                {people.length === 0 ? (
                  <Text testID="attendees-dialog-empty" fontSize={13} color="$muted" padding={10}>
                    {t('mweb.podDetails.noAttendeesYet')}
                  </Text>
                ) : (
                  people.map((person) => (
                    <AttendeeRow
                      key={person.user_id}
                      person={person}
                      label={(person.seats ?? 1) > 1 ? otherMembersLabel(person.seats ?? 1, t) : ''}
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
            </ModalSafeArea>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
