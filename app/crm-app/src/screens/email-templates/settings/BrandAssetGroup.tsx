import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { crmImageMeta, type CrmEmailBrandGroup } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { IconButton } from '@/components/email-templates/IconButton';
import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { RADII } from '@/constants/design';
import type { BrandAsset } from '@/features/email-templates/useEmailSettings';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  group: CrmEmailBrandGroup;
  assets: readonly BrandAsset[];
  primaryLogoId: string | null;
  busy: boolean;
  onUpload: () => void;
  onPreview: (asset: BrandAsset) => void;
  onMenu: (asset: BrandAsset) => void;
}

/** One shelf of the brand library — Logos, Banners or Images — with its upload button. */
export function BrandAssetGroup({
  group,
  assets,
  primaryLogoId,
  busy,
  onUpload,
  onPreview,
  onMenu,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <YStack gap="$2" role="list" aria-label={t(group.titleKey)}>
      <Text fontWeight="800" fontSize="$5" role="heading">
        {t(group.titleKey)}
      </Text>
      <Text color="$muted" fontSize="$2">
        {t(group.hintKey)}
      </Text>
      <DuncitButton
        label={t(group.uploadKey)}
        onPress={onUpload}
        variant="outline"
        disabled={busy}
        icon={<MaterialIcons name="upload" size={18} color={theme.accentText?.val} />}
        testID={`brand-upload-${group.kind}`}
      />
      {assets.length === 0 ? (
        <Text color="$muted" fontSize="$2">
          {t(group.emptyKey)}
        </Text>
      ) : null}
      {assets.map((asset) => {
        const label = asset.name || t('crm.media.untitled');
        return (
          <XStack
            key={asset.id}
            {...SURFACE}
            alignItems="center"
            gap="$3"
            role="listitem"
            testID={`brand-asset-${asset.id}`}
          >
            <YStack
              role="button"
              aria-label={t('crm.media.previewNamed', { vars: { name: label } })}
              onPress={() => onPreview(asset)}
              width={72}
              height={54}
              borderRadius={RADII.sm}
              backgroundColor="$soft"
              overflow="hidden"
              testID={`brand-preview-${asset.id}`}
            >
              <Image
                source={{ uri: asset.url }}
                resizeMode={group.fit}
                style={{ width: '100%', height: '100%' }}
              />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text fontWeight="700" numberOfLines={1}>
                {label}
              </Text>
              <Text color="$muted" fontSize="$2" numberOfLines={1}>
                {crmImageMeta(asset)}
              </Text>
              {asset.id === primaryLogoId ? (
                <ToneChip label={t('crm.emailSettings.emailLogo')} tone="info" />
              ) : null}
            </YStack>
            <IconButton
              icon="more-vert"
              label={t('crm.media.actionsFor', { vars: { name: label } })}
              onPress={() => onMenu(asset)}
              testID={`brand-menu-${asset.id}`}
            />
          </XStack>
        );
      })}
    </YStack>
  );
}
