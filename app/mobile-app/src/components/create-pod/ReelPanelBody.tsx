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
          gap={10}
          padding={10}
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <YStack
            width={44}
            height={44}
            borderRadius={10}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <MaterialIcons name="videocam" size={22} color={muted} />
          </YStack>
          <Text flex={1} fontSize={13} fontWeight="700" color="$color" numberOfLines={1}>
            {fileName}
          </Text>
          <XStack
            testID="reel-remove"
            role="button"
            aria-label={t('mweb.createPod.removeReel')}
            onPress={onRemove}
            width={28}
            height={28}
            alignItems="center"
            justifyContent="center"
            borderRadius={14}
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
          paddingVertical={14}
          borderRadius={12}
          borderWidth={2}
          borderColor="$borderColor"
          borderStyle="dashed"
          backgroundColor="$surface"
          opacity={uploading ? 0.7 : 1}
          pressStyle={PRESS_STYLE.control}
        >
          {uploading ? (
            <Spinner size="small" color={primary} />
          ) : (
            <MaterialIcons name="video-library" size={20} color={primary} />
          )}
          <Text fontSize={13.5} fontWeight="600" color="$color">
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
