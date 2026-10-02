import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface MediaAddTileProps {
  busy: boolean;
  full: boolean;
  maxImages?: number;
  /** The formats + size line from admin Upload Settings. */
  hint: string;
  primary: string;
  onOpen: () => void;
}

/** The dashed "Add photos or video" tile that opens the picker. */
export function MediaAddTile({
  busy,
  full,
  maxImages,
  hint,
  primary,
  onOpen,
}: Readonly<MediaAddTileProps>) {
  const { t } = useTranslation();
  return (
    <YStack
      testID="media-upload-add"
      tabIndex={0}
      role="button"
      aria-label={t('mweb.createPod.addMedia')}
      aria-disabled={busy || full}
      onPress={busy || full ? undefined : onOpen}
      alignItems="center"
      justifyContent="center"
      gap={8}
      paddingVertical={24}
      paddingHorizontal={16}
      borderRadius={16}
      borderWidth={2}
      borderColor="$borderColor"
      borderStyle="dashed"
      backgroundColor="$soft"
      opacity={busy ? 0.7 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <YStack
        width={52}
        height={52}
        borderRadius={26}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$surface"
      >
        <MaterialIcons name="add-photo-alternate" size={24} color={primary} />
      </YStack>
      <Text fontSize={14} fontWeight="600" color="$color">
        {full ? t('mweb.createPod.mediaAtMaximum') : t('mweb.createPod.addPhotosOrVideo')}
      </Text>
      <Text fontSize={12} color="$muted">
        {full ? t('mweb.createPod.mediaMaxRemoveHint', { vars: { max: maxImages ?? 0 } }) : hint}
      </Text>
    </YStack>
  );
}
