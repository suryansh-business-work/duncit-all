import { Image, Linking, Modal } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { crmImageMeta } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { IconButton } from '@/components/email-templates/IconButton';
import { ModalPage } from '@/components/ModalPage';
import type { BrandAsset } from '@/features/email-templates/useEmailSettings';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  asset: BrandAsset;
  onClose: () => void;
}

function PreviewBody({ asset, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = asset.name || t('crm.media.untitled');
  return (
    <ModalPage label={label}>
      <XStack
        alignItems="center"
        paddingLeft="$4"
        paddingRight="$2"
        borderBottomWidth={1}
        borderColor="$borderColor"
      >
        <YStack flex={1} paddingVertical="$2">
          <Text fontWeight="700" fontSize="$5" role="heading" numberOfLines={1}>
            {label}
          </Text>
          <Text color="$muted" fontSize="$2">
            {crmImageMeta(asset)}
          </Text>
        </YStack>
        <IconButton
          icon="close"
          label={t('shell.common.close')}
          onPress={onClose}
          testID="brand-preview-close"
        />
      </XStack>
      <YStack flex={1} padding="$4" gap="$3">
        <Image
          source={{ uri: asset.url }}
          accessibilityLabel={label}
          resizeMode="contain"
          style={{ flex: 1 }}
        />
        <DuncitButton
          label={t('crm.media.openOriginal')}
          onPress={() =>
            fireAndForget(
              Linking.openURL(asset.url),
              logs.mobileApp,
              'crm-app/BrandAssetPreview',
              'open',
            )
          }
          variant="outline"
          fullWidth
          testID="brand-preview-open"
        />
      </YStack>
    </ModalPage>
  );
}

/** One brand image at full size with its details, and a way to open the original file. */
export function BrandAssetPreview({
  asset,
  onClose,
}: Readonly<{ asset: BrandAsset | null; onClose: () => void }>) {
  return (
    <Modal visible={asset !== null} animationType="fade" onRequestClose={onClose}>
      {asset ? <PreviewBody asset={asset} onClose={onClose} /> : null}
    </Modal>
  );
}
