import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface ActionRowProps {
  icon: IconName;
  label: string;
  color: string;
  testID: string;
  onPress: () => void;
}

/** A single tappable row in the photo action sheet. */
function ActionRow({ icon, label, color, testID, onPress }: Readonly<ActionRowProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={14}
      height={52}
      paddingHorizontal={4}
      pressStyle={{ opacity: 0.6 }}
    >
      <MaterialIcons name={icon} size={22} color={color} />
      <Text fontSize={15} fontWeight="800" color={color}>
        {label}
      </Text>
    </XStack>
  );
}

interface Props {
  open: boolean;
  hasPhoto: boolean;
  onView: () => void;
  onChange: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/** Instagram-style profile-photo menu (item 9): View / Change / Remove. The
 * Remove row only appears when a photo exists. */
export function PhotoActionSheet({
  open,
  hasPhoto,
  onView,
  onChange,
  onRemove,
  onClose,
}: Readonly<Props>) {
  const { color, danger } = useThemeColors();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="photo-action-sheet">
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
            backgroundColor="$background"
            borderTopLeftRadius={22}
            borderTopRightRadius={22}
            paddingHorizontal={18}
            paddingTop={10}
          >
            <SafeAreaView edges={['bottom']}>
              <YStack
                alignSelf="center"
                width={44}
                height={5}
                borderRadius={999}
                backgroundColor="$borderColor"
                marginBottom={8}
              />
              {hasPhoto ? (
                <ActionRow
                  icon="visibility"
                  label="View photo"
                  color={color}
                  testID="photo-action-view"
                  onPress={onView}
                />
              ) : null}
              <ActionRow
                icon="photo-camera"
                label="Change photo"
                color={color}
                testID="photo-action-change"
                onPress={onChange}
              />
              {hasPhoto ? (
                <ActionRow
                  icon="delete-outline"
                  label="Remove photo"
                  color={danger}
                  testID="photo-action-remove"
                  onPress={onRemove}
                />
              ) : null}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
