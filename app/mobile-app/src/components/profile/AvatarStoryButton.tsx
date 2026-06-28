import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  photo?: string | null;
  initial: string;
  size: number;
  /** True when the user has an active story → coloured ring + tap views it. */
  hasStory: boolean;
  saving?: boolean;
  /** Tap: view the active story, or add one when none exists (item 12). */
  onPress: () => void;
  /** Long-press: open the photo action menu (item 9). */
  onLongPress: () => void;
  /** The "+" badge: always add a story, even when one already exists (item 12). */
  onAddStory: () => void;
  /** The edit pencil affordance — also opens the photo menu (item 9). */
  onEditPhoto: () => void;
  testID?: string;
}

/** Avatar with the Instagram-style interactions (items 9 + 12): a story ring +
 * tap-to-view/add, long-press photo menu, a "+" add-story badge and an edit
 * pencil. Shared by the Profile and Profile-Settings headers. */
export function AvatarStoryButton({
  photo,
  initial,
  size,
  hasStory,
  saving = false,
  onPress,
  onLongPress,
  onAddStory,
  onEditPhoto,
  testID = 'avatar-story-button',
}: Readonly<Props>) {
  const { onPrimary, primary, color } = useThemeColors();
  const badge = Math.round(size * 0.34);

  return (
    <YStack width={size} height={size}>
      <YStack
        testID={testID}
        role="button"
        aria-label={hasStory ? 'View your story' : 'Add a story'}
        onPress={onPress}
        onLongPress={onLongPress}
        width={size}
        height={size}
        borderRadius={size / 2}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
        borderWidth={hasStory ? 3 : 0}
        borderColor={hasStory ? '$primary' : 'transparent'}
        pressStyle={{ opacity: 0.85 }}
      >
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={size * 0.4} fontWeight="900" color={onPrimary}>
            {initial}
          </Text>
        )}
      </YStack>

      <YStack
        testID={`${testID}-add-story`}
        role="button"
        aria-label="Add story"
        onPress={onAddStory}
        position="absolute"
        bottom={-2}
        left={-2}
        width={badge}
        height={badge}
        borderRadius={badge / 2}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
        borderWidth={2}
        borderColor="$background"
      >
        <MaterialIcons name="add" size={badge * 0.6} color={onPrimary} />
      </YStack>

      <YStack
        testID={`${testID}-edit`}
        role="button"
        aria-label="Edit photo"
        aria-disabled={saving}
        onPress={saving ? undefined : onEditPhoto}
        position="absolute"
        bottom={-2}
        right={-2}
        width={badge}
        height={badge}
        borderRadius={badge / 2}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
      >
        {saving ? (
          <Spinner size="small" color="$primary" />
        ) : (
          <MaterialIcons name="edit" size={badge * 0.5} color={hasStory ? primary : color} />
        )}
      </YStack>
    </YStack>
  );
}
