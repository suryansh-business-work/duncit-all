import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useSuperCategories } from '@/hooks/useSuperCategories';

/**
 * Header super-category filter — pixel-parity port of mWeb's full-width
 * SuperCategoryTabs (ToggleButtonGroup fullWidth): one bordered group on the
 * surface tint, every category as an equal-width segment, and the selected
 * segment filled by the brand gradient pill with white text. No "All" tab —
 * like mWeb, the first super category is selected by default.
 */
export function SuperCategoryTabs() {
  const { superCats, selectedSlug, select, isLoading } = useSuperCategories();

  if (isLoading && superCats.length === 0) {
    return (
      <XStack paddingHorizontal={16} paddingBottom={8}>
        <Skeleton width="100%" height={40} radius={14} />
      </XStack>
    );
  }
  if (superCats.length === 0) return null;

  return (
    <XStack paddingHorizontal={16} paddingBottom={8}>
      <XStack
        testID="super-cat-tabs"
        flex={1}
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        overflow="hidden"
      >
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
              height={40}
              paddingHorizontal={6}
              borderRadius={14}
              overflow="hidden"
              alignItems="center"
              justifyContent="center"
              gap={4}
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
                  DOM paints positioned siblings over static ones, so the label
                  needs an explicit stacking context (zIndex) or it disappears
                  behind the selected pill — mWeb gives its buttons the same. */}
              <XStack alignItems="center" gap={4} zIndex={1}>
                {cat.icon ? <Text fontSize={14}>{cat.icon}</Text> : null}
                <Text
                  numberOfLines={1}
                  fontSize={12}
                  fontWeight="900"
                  color={selected ? '#ffffff' : '$muted'}
                >
                  {cat.name}
                </Text>
              </XStack>
            </XStack>
          );
        })}
      </XStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  // Keep the selected pill behind the label (web paints positioned nodes last).
  gradient: { zIndex: 0 },
});
