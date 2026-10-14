import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { FOOD_FEEDBACK_LIMITS } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const THUMB_SIZE = 72;
const REMOVE_SIZE = 24;
// The remove badge is small on purpose; its touch target is not.
const REMOVE_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

interface Props {
  images: string[];
  /** Without these the photos are only shown — the rating already given. */
  onAdd?: () => void;
  onRemove?: (url: string) => void;
  uploading?: boolean;
  /** Why the last photo did not go up, or null. */
  error?: string | null;
  disabled?: boolean;
}

/**
 * A rating's photos: the thumbnails — each with a remove while the rating is
 * still being written — and "Add photo" until the limit is reached. The same
 * row, without its controls, shows the photos of a rating already sent.
 */
export function FoodFeedbackPhotos({
  images,
  onAdd,
  onRemove,
  uploading = false,
  error = null,
  disabled = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, background } = useThemeColors();
  const full = images.length >= FOOD_FEEDBACK_LIMITS.imagesMax;

  return (
    <YStack gap={8}>
      {images.length > 0 ? (
        <XStack testID="food-feedback-photos" role="list" gap={12} flexWrap="wrap">
          {images.map((url, index) => (
            <YStack key={url} role="listitem" width={THUMB_SIZE} height={THUMB_SIZE}>
              <AppImage
                testID={`food-feedback-photo-${index + 1}`}
                source={{ uri: url }}
                style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8 }}
                accessibilityLabel={t('mweb.venueFood.feedback.photoAlt', {
                  vars: { number: String(index + 1) },
                })}
              />
              {onRemove ? (
                <YStack
                  testID={`food-feedback-photo-remove-${index + 1}`}
                  role="button"
                  tabIndex={0}
                  aria-label={t('mweb.venueFood.feedback.removePhoto', {
                    vars: { number: String(index + 1) },
                  })}
                  aria-disabled={disabled || undefined}
                  hitSlop={REMOVE_HIT_SLOP}
                  onPress={disabled ? undefined : () => onRemove(url)}
                  pressStyle={PRESS_STYLE.surface}
                  position="absolute"
                  top={-8}
                  right={-8}
                  width={REMOVE_SIZE}
                  height={REMOVE_SIZE}
                  borderRadius={REMOVE_SIZE / 2}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$color"
                >
                  <MaterialIcons name="close" size={16} color={background} />
                </YStack>
              ) : null}
            </YStack>
          ))}
        </XStack>
      ) : null}
      {onAdd && !full ? (
        <XStack>
          <DuncitButton
            testID="food-feedback-add-photo"
            label={t(
              uploading ? 'mweb.venueFood.feedback.uploading' : 'mweb.venueFood.feedback.addPhoto',
            )}
            variant="outline"
            tone="neutral"
            size="sm"
            loading={uploading}
            disabled={uploading || disabled}
            icon={<MaterialIcons name="add-a-photo" size={18} color={ink} />}
            onPress={onAdd}
          />
        </XStack>
      ) : null}
      {error ? (
        <Text testID="food-feedback-photo-error" role="alert" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
