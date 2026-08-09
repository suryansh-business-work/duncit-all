import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  posting: boolean;
  /** The signed-in user's profile photo, shown beside the input (explore item 3). */
  viewerPhoto?: string | null;
}

/** The bottom input row for adding a comment, with the viewer's avatar. Disabled
 * (sign-in hint) when there is no viewer. */
export function CommentComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  posting,
  viewerPhoto,
}: Readonly<Props>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const canSend = !disabled && !posting && !!value.trim();
  const placeholder = disabled
    ? t('mweb.podDetails.signInToComment')
    : t('mweb.podDetails.addComment');
  return (
    <XStack
      gap={8}
      alignItems="center"
      paddingHorizontal={16}
      paddingVertical={10}
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      {viewerPhoto ? (
        <AppImage
          source={{ uri: viewerPhoto }}
          style={{ width: 32, height: 32, borderRadius: 16 }}
        />
      ) : (
        <YStack
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor="$surface"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="person" size={18} color={muted} />
        </YStack>
      )}
      <Input
        testID="pod-comment-input"
        aria-label={t('mweb.podDetails.comment')}
        flex={1}
        value={value}
        onChangeText={onChange}
        disabled={disabled}
        placeholder={placeholder}
        placeholderTextColor="$muted"
        onSubmitEditing={onSubmit}
      />
      <XStack
        testID="pod-comment-send"
        role="button"
        aria-label={t('mweb.podDetails.sendComment')}
        onPress={onSubmit}
        width={42}
        height={42}
        borderRadius={21}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
        opacity={canSend ? 1 : 0.5}
        pressStyle={{ opacity: 0.8 }}
      >
        {posting ? (
          <Spinner color="#ffffff" />
        ) : (
          <MaterialIcons name="send" size={18} color="#ffffff" />
        )}
      </XStack>
    </XStack>
  );
}
