import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useTranslation } from '@/hooks/useTranslation';

/** Dialog title + close affordance; both are inert while an upload is running. */
export function CropHeader({
  isImage,
  uploading,
  onCancel,
}: Readonly<{ isImage: boolean; uploading: boolean; onCancel: () => void }>) {
  const { t } = useTranslation();
  return (
    <XStack alignItems="center" justifyContent="space-between" padding={16}>
      <Text testID="crop-title" role="heading" color="#ffffff" fontSize={17} fontWeight="600">
        {isImage ? 'Crop & upload' : 'Upload video'}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID="crop-close"
        role="button"
        tabIndex={0}
        hitSlop={2}
        aria-label={t('mweb.common.cancel')}
        onPress={uploading ? undefined : onCancel}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        backgroundColor="rgba(255,255,255,0.16)"
        opacity={uploading ? 0.5 : 1}
      >
        <MaterialIcons name="close" size={20} color="#ffffff" />
      </XStack>
    </XStack>
  );
}

/** Cancel / Upload footer; both are inert while an upload is running. */
export function CropActions({
  isImage,
  uploading,
  onPrimary,
  onCancel,
  onConfirm,
}: Readonly<{
  isImage: boolean;
  uploading: boolean;
  onPrimary: string;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <XStack gap={12} paddingBottom={8}>
      <XStack
        testID="crop-cancel"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.common.cancel')}
        onPress={uploading ? undefined : onCancel}
        flex={1}
        height={52}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="rgba(255,255,255,0.4)"
        opacity={uploading ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={15} fontWeight="600" color="#ffffff">
          Cancel
        </Text>
      </XStack>
      <XStack
        testID="crop-confirm"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.mediaCrop.upload')}
        aria-disabled={uploading}
        onPress={uploading ? undefined : onConfirm}
        flex={1}
        height={52}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={999}
        backgroundColor="$primary"
        opacity={uploading ? 0.7 : 1}
        pressStyle={PRESS_STYLE.solid}
      >
        {uploading ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={15} fontWeight="600" color={onPrimary}>
          {isImage ? 'Use photo' : 'Upload'}
        </Text>
      </XStack>
    </XStack>
  );
}
