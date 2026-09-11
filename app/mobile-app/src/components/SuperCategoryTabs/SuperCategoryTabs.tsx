import { Text, XStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Super-category switch — "For You" / "For Your Pet" — as a segmented pill:
 * a `$surface` track with one equal segment per super category, the selected
 * one filled green. Tamagui twin of mWeb's SuperCategoryTabs; names and icons
 * stay admin-managed, and like mWeb there is no "All" tab.
 */
export function SuperCategoryTabs() {
  const { superCats, selectedSlug, select, isLoading } = useSuperCategories();

  if (isLoading && superCats.length === 0) {
    return (
      <XStack paddingHorizontal={16} paddingBottom={12}>
        <Skeleton width="100%" height={44} radius={999} />
      </XStack>
    );
  }
  if (superCats.length === 0) return null;

  return (
    <XStack
      testID="super-cat-tabs"
      marginHorizontal={16}
      marginBottom={12}
      height={44}
      padding={4}
      gap={4}
      borderRadius={999}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$cardBorder"
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
            minWidth={0}
            alignItems="center"
            justifyContent="center"
            gap={6}
            paddingHorizontal={12}
            borderRadius={999}
            backgroundColor={selected ? '$primary' : 'transparent'}
            pressStyle={PRESS_STYLE.control}
          >
            {cat.icon ? <Text fontSize={16}>{cat.icon}</Text> : null}
            <Text
              flexShrink={1}
              numberOfLines={1}
              fontSize={13}
              fontWeight="600"
              color={selected ? '$onPrimary' : '$color'}
            >
              {cat.name}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
