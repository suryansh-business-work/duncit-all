import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
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
      <Text fontSize={15} fontWeight="600" color={color}>
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

/**
 * Instagram-style profile-photo menu: View / Change / Remove. The Remove row
 * only appears when a photo exists.
 *
 * Chrome-less by design — a grabber instead of a title bar — which
 * {@link DuncitDialog} supports by omitting `title`. The rows scroll if a future
 * one does not fit; previously they simply ran off a capless sheet.
 */
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
    <DuncitDialog open={open} onClose={onClose} testID="photo-action-sheet" closeLabel="Close">
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
    </DuncitDialog>
  );
}
