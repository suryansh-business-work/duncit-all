import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { MB, useUploadLimits } from '@/hooks/useUploadLimits';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  value: string;
  uploading: boolean;
  /** Busy-state button copy, computed by the parent (e.g. "Uploading… 42%"). */
  busyLabel: string;
  error?: string;
  onPick: () => void;
  onRemove: () => void;
}

/** Expanded "Pod Reel" panel: helper copy + either the picked-reel preview row
 * or the pick-a-video upload button, with the inline upload/validation error. */
export function ReelPanelBody({
  value,
  uploading,
  busyLabel,
  error,
  onPick,
  onRemove,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const limits = useUploadLimits();
  const fileName = value.slice(value.lastIndexOf('/') + 1);
  return (
    <YStack gap={10}>
      <Text fontSize={12} color="$muted">
        {t('mweb.createPod.reelCapHint', { vars: { max: Math.round(limits.maxVideoBytes / MB) } })}
      </Text>
      {value ? (
        <XStack
          testID="reel-preview"
          alignItems="center"
          gap={12}
          padding={12}
          borderRadius={16}
          backgroundColor="$soft"
        >
          <YStack
            width={44}
            height={44}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$surface"
          >
            <MaterialIcons name="videocam" size={22} color={muted} />
          </YStack>
          <Text flex={1} fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
            {fileName}
          </Text>
          <XStack
            testID="reel-remove"
            role="button"
            aria-label={t('mweb.createPod.removeReel')}
            onPress={onRemove}
            width={32}
            height={32}
            alignItems="center"
            justifyContent="center"
            borderRadius={16}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons name="close" size={16} color={muted} />
          </XStack>
        </XStack>
      ) : (
        <XStack
          testID="reel-upload-add"
          role="button"
          aria-label={t('mweb.createPod.reelUploadAria')}
          aria-disabled={uploading}
          onPress={uploading ? undefined : onPick}
          alignItems="center"
          justifyContent="center"
          gap={8}
          paddingVertical={16}
          borderRadius={16}
          borderWidth={2}
          borderColor="$borderColor"
          borderStyle="dashed"
          backgroundColor="$soft"
          opacity={uploading ? 0.7 : 1}
          pressStyle={PRESS_STYLE.control}
        >
          {uploading ? (
            <Spinner size="small" color={primary} />
          ) : (
            <MaterialIcons name="video-library" size={20} color={primary} />
          )}
          <Text fontSize={14} fontWeight="600" color="$color">
            {uploading ? busyLabel : t('mweb.createPod.reelUpload')}
          </Text>
        </XStack>
      )}
      {error ? (
        <Text testID="reel-upload-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
