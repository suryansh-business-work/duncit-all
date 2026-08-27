import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  photo?: string | null;
  initial: string;
  size: number;
  /** True when the user has an active story → coloured ring + tap views it. */
  hasStory: boolean;
  saving?: boolean;
  /** Tap: view the active story, or the photo full-size when there is none. */
  onPress: () => void;
  /** Long-press: open the photo action menu. */
  onLongPress: () => void;
  /** The edit pencil affordance — also opens the photo menu. */
  onEditPhoto: () => void;
  testID?: string;
}

/**
 * Avatar with a story ring + tap-to-view, long-press photo menu and an edit
 * pencil. mWeb's AvatarButton twin (rule 27).
 *
 * There is deliberately no "+" badge and no add-a-story path here any more. A
 * story is posted from Home, where the whole status rail is — putting a second
 * entrance on the profile photo meant the same picture both WAS the account's
 * identity and was a button that published something, and people tapped it
 * expecting the first.
 */
export function AvatarStoryButton({
  photo,
  initial,
  size,
  hasStory,
  saving = false,
  onPress,
  onLongPress,
  onEditPhoto,
  testID = 'avatar-story-button',
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary, primary, color } = useThemeColors();
  const badge = Math.round(size * 0.34);
  const label = hasStory
    ? t('mweb.profileAvatar.viewYourStory')
    : t('mweb.profileAvatar.profilePhoto');

  return (
    <YStack width={size} height={size}>
      <YStack
        testID={testID}
        role="button"
        aria-label={label}
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
        pressStyle={PRESS_STYLE.control}
      >
        {photo ? (
          <AppImage
            source={{ uri: photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={size * 0.4} fontWeight="700" color={onPrimary}>
            {initial}
          </Text>
        )}
      </YStack>

      <YStack
        pressStyle={PRESS_STYLE.surface}
        testID={`${testID}-edit`}
        role="button"
        aria-label={t('mweb.common.editPhoto')}
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
