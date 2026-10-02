import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface StepButtonProps {
  testID: string;
  icon: 'chevron-left' | 'chevron-right';
  disabled: boolean;
  onPress: () => void;
}

export function StepButton({ testID, icon, disabled, onPress }: Readonly<StepButtonProps>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      hitSlop={2}
      aria-label={icon === 'chevron-left' ? 'Earlier start' : 'Later start'}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor="$soft"
      opacity={disabled ? 0.4 : 1}
      pressStyle={PRESS_STYLE.row}
    >
      <MaterialIcons name={icon} size={24} color={muted} />
    </XStack>
  );
}

interface PreviewFooterProps {
  needsTrim: boolean;
  onPrimary: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Cancel / Post — the post button says "Trim & Post" for an over-long clip. */
export function PreviewFooter({
  needsTrim,
  onPrimary,
  onCancel,
  onConfirm,
}: Readonly<PreviewFooterProps>) {
  const { t } = useTranslation();
  return (
    <XStack gap={12}>
      <XStack
        testID="story-video-cancel"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.common.cancel')}
        onPress={onCancel}
        flex={1}
        height={52}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$soft"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          Cancel
        </Text>
      </XStack>
      <XStack
        testID="story-video-post"
        role="button"
        tabIndex={0}
        aria-label={needsTrim ? 'Trim and post' : 'Post story'}
        onPress={onConfirm}
        flex={1}
        height={52}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color={onPrimary}>
          {needsTrim ? 'Trim & Post' : 'Post story'}
        </Text>
      </XStack>
    </XStack>
  );
}
