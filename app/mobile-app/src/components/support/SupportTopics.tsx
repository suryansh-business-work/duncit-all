import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { FaqGroup } from '@/hooks/useLibrary';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useTranslation } from '@/hooks/useTranslation';

/** Renders a super-category `icon`: an image thumbnail for a URL, an emoji for a
 * short string, or a MaterialIcons fallback (mirrors VibeCategoryTab's TabIcon
 * and mWeb's renderSuperCategoryMark). */
function TopicIcon({ icon, tint }: Readonly<{ icon?: string | null; tint: string }>) {
  if (icon?.startsWith('http')) {
    return <AppImage source={{ uri: icon }} style={{ width: 22, height: 22, borderRadius: 6 }} />;
  }
  if (icon) {
    return <Text fontSize={18}>{icon}</Text>;
  }
  return <MaterialIcons name="help-outline" size={20} color={tint} />;
}

interface SupportTopicRowProps {
  group: FaqGroup;
  isLast: boolean;
  onOpen: () => void;
}

/** One "Topics" row — category icon + name + article count. */
function SupportTopicRow({ group, isLast, onOpen }: Readonly<SupportTopicRowProps>) {
  const { accent, muted } = useThemeColors();
  const id = group.super_category?.id ?? 'GENERIC';
  const name = group.super_category?.name ?? 'General';
  const count = group.faqs.length;
  const countLabel = count === 1 ? 'article' : 'articles';

  return (
    <XStack
      testID={`support-topic-${id}`}
      role="button"
      aria-label={name}
      onPress={onOpen}
      alignItems="center"
      gap={12}
      paddingHorizontal={16}
      paddingVertical={14}
      borderBottomWidth={isLast ? 0 : 1}
      borderBottomColor="$borderColor"
      pressStyle={PRESS_STYLE.row}
    >
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <TopicIcon icon={group.super_category?.icon} tint={accent} />
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {name}
        </Text>
        <Text fontSize={12} color="$muted">
          {count} {countLabel}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </XStack>
  );
}

interface SupportTopicsProps {
  groups: FaqGroup[];
  onOpenTopic: () => void;
}

/** "Topics" list — one row per FAQ super-category with its article count,
 * navigating to the full FAQs browser. RN twin of mWeb's SupportTopics. */
export function SupportTopics({ groups, onOpenTopic }: Readonly<SupportTopicsProps>) {
  const { t } = useTranslation();
  if (groups.length === 0) return null;
  return (
    <YStack gap={12}>
      <SectionHeader title={t('mweb.supportHub.topics')} />
      <SurfaceCard padding={0} overflow="hidden">
        {groups.map((group, index) => (
          <SupportTopicRow
            key={group.super_category?.id ?? 'general'}
            group={group}
            isLast={index === groups.length - 1}
            onOpen={onOpenTopic}
          />
        ))}
      </SurfaceCard>
    </YStack>
  );
}
