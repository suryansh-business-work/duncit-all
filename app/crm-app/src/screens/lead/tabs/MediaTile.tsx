import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Text, XStack, YStack } from 'tamagui';
import { crmImageMeta } from '@duncit/utils';

import { RADII } from '@/constants/design';
import { SURFACE } from '@/components/surface';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadMediaItem } from './MediaState';
import { TabIconButton } from './TabIconButton';

const FILL = { width: '100%', height: '100%' } as const;

/** The picture itself: SVG logos through the vector renderer, everything else as a bitmap. */
export function MediaPicture({
  item,
  fit,
}: Readonly<{ item: Pick<LeadMediaItem, 'url' | 'mime_type'>; fit: 'contain' | 'cover' }>) {
  if (item.mime_type === 'image/svg+xml') return <SvgUri uri={item.url} {...FILL} />;
  return <Image source={{ uri: item.url }} style={FILL} resizeMode={fit} />;
}

interface Props {
  item: LeadMediaItem;
  fit: 'contain' | 'cover';
  onPreview: () => void;
  onActions: () => void;
}

/** One logo or image: a tappable preview, its name and details, and its actions. */
export function MediaTile({ item, fit, onPreview, onActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = item.name || t('crm.media.untitled');
  return (
    <YStack {...SURFACE} padding="$2" gap="$1.5" width="48%" testID={`media-tile-${item.id}`}>
      <YStack
        role="button"
        aria-label={t('crm.media.previewNamed', { vars: { name: label } })}
        onPress={onPreview}
        aspectRatio={4 / 3}
        backgroundColor="$soft"
        borderRadius={RADII.sm}
        overflow="hidden"
        padding={fit === 'contain' ? '$2' : 0}
        testID={`media-preview-${item.id}`}
      >
        <MediaPicture item={item} fit={fit} />
      </YStack>
      <XStack alignItems="center" gap="$1">
        <YStack flex={1}>
          <Text fontWeight="700" numberOfLines={1}>
            {label}
          </Text>
          <Text color="$muted" fontSize="$1" numberOfLines={1}>
            {crmImageMeta(item)}
          </Text>
        </YStack>
        <TabIconButton
          icon="more-vert"
          label={t('crm.media.actionsFor', { vars: { name: label } })}
          onPress={onActions}
          testID={`media-actions-${item.id}`}
        />
      </XStack>
    </YStack>
  );
}
