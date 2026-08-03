import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Super-category switch as the mock's promo tiles — "For You" / "For Your Pet":
 * the active super-category is a pink gradient card, the others are surface
 * cards. Tamagui twin of mWeb's SuperCategoryTabs; names and icons stay
 * admin-managed, and like mWeb there is no "All" tab.
 */
export function SuperCategoryTabs() {
  const { superCats, selectedSlug, select, isLoading } = useSuperCategories();
  const { t } = useTranslation();

  if (isLoading && superCats.length === 0) {
    return (
      <XStack paddingHorizontal={16} paddingBottom={8}>
        <Skeleton width="100%" height={64} radius={16} />
      </XStack>
    );
  }
  if (superCats.length === 0) return null;

  // Admin-managed: the super category's description (Categories > edit super
  // category). The bundled copy is only the fallback while it is unset.
  const subtitleOf = (cat: { slug: string; description?: string | null }): string => {
    if (cat.description?.trim()) return cat.description.trim();
    if (cat.slug.toLowerCase().includes('pet')) return t('mweb.home.forPetSubtitle');
    return t('mweb.home.forYouSubtitle');
  };

  return (
    <XStack testID="super-cat-tabs" paddingHorizontal={16} paddingBottom={8} gap={8}>
      {superCats.map((cat) => {
        const selected = selectedSlug === cat.slug;
        return (
          <XStack
            key={cat.id}
            testID={`super-cat-${cat.slug}`}
            role="button"
            aria-label={cat.name}
            aria-pressed={selected}
            onPress={() => select(cat.slug)}
            flex={1}
            minWidth={0}
            borderRadius={16}
            borderWidth={1}
            borderColor={selected ? 'transparent' : '$borderColor'}
            backgroundColor={selected ? 'transparent' : '$surface'}
            overflow="hidden"
            alignItems="center"
            gap={8}
            paddingHorizontal={12}
            paddingVertical={10}
            pressStyle={{ opacity: 0.85 }}
          >
            {selected ? (
              <LinearGradient
                colors={['#ff4f73', '#ff7a59', '#f5337a']}
                locations={[0, 0.58, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.gradient]}
              />
            ) : null}
            {/* Content sits above the absolute gradient. On Native App Web the
                DOM paints positioned siblings over static ones, so the content
                needs an explicit stacking context (zIndex) or it disappears
                behind the selected pill — mWeb gives its buttons the same. */}
            {cat.icon ? (
              <Text fontSize={20} zIndex={1}>
                {cat.icon}
              </Text>
            ) : null}
            <YStack flex={1} minWidth={0} zIndex={1}>
              <Text
                numberOfLines={1}
                fontSize={13}
                fontWeight="700"
                color={selected ? '#ffffff' : '$color'}
              >
                {cat.name}
              </Text>
              <Text
                numberOfLines={1}
                fontSize={10.5}
                fontWeight="600"
                color={selected ? 'rgba(255,255,255,0.92)' : '$muted'}
              >
                {subtitleOf(cat)}
              </Text>
            </YStack>
          </XStack>
        );
      })}
    </XStack>
  );
}

const styles = StyleSheet.create({
  // Keep the selected pill behind the label (web paints positioned nodes last).
  gradient: { zIndex: 0 },
});
