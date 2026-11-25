import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_LEAD_MEDIA_LIMITS, type CrmLeadMediaGroup } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadMediaItem } from './MediaState';
import { MediaTile } from './MediaTile';

interface Props {
  group: CrmLeadMediaGroup;
  items: readonly LeadMediaItem[];
  busy: boolean;
  onUpload: () => void;
  onPreview: (item: LeadMediaItem) => void;
  onActions: (item: LeadMediaItem) => void;
}

/** One half of Logos & Images: its heading and count, the upload button and the grid (or an empty state). */
export function MediaGroup({
  group,
  items,
  busy,
  onUpload,
  onPreview,
  onActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const limit = CRM_LEAD_MEDIA_LIMITS[group.kind];
  return (
    <YStack gap="$2" aria-label={t(group.titleKey)} testID={`media-group-${group.kind}`}>
      <XStack alignItems="baseline" gap="$2">
        <Text fontWeight="800" fontSize="$5" role="heading">
          {t(group.titleKey)}
        </Text>
        <Text color="$muted" fontSize="$2">
          {t('crm.media.countOfLimit', { vars: { count: items.length, limit } })}
        </Text>
      </XStack>
      <Text color="$muted" fontSize="$2">
        {t(group.hintKey)}
      </Text>
      <DuncitButton
        label={t(group.uploadKey)}
        onPress={onUpload}
        variant="outline"
        size="sm"
        disabled={items.length >= limit}
        loading={busy}
        icon={<MaterialIcons name="file-upload" size={18} color={theme.accentText?.val} />}
        testID={`lead-media-upload-${group.kind}`}
      />
      {items.length === 0 ? (
        <Text color="$muted">{t(group.emptyKey)}</Text>
      ) : (
        <XStack flexWrap="wrap" justifyContent="space-between" rowGap="$2">
          {items.map((item) => (
            <MediaTile
              key={item.id}
              item={item}
              fit={group.fit}
              onPreview={() => onPreview(item)}
              onActions={() => onActions(item)}
            />
          ))}
        </XStack>
      )}
    </YStack>
  );
}
