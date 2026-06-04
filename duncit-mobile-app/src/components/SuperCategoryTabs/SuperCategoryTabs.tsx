import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, Text, XStack } from 'tamagui';

import { Skeleton } from '@/components/Skeleton';
import { useSuperCategories } from '@/hooks/useSuperCategories';

interface Tab {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
}

/** Header super-category filter — a scrollable segmented control with a gradient
 * active pill. RN port of mWeb's SuperCategoryTabs. */
export function SuperCategoryTabs() {
  const { superCats, selectedSlug, select, isLoading } = useSuperCategories();

  if (isLoading && superCats.length === 0) {
    return (
      <XStack paddingHorizontal={16} paddingBottom={8}>
        <Skeleton width="100%" height={38} radius={14} />
      </XStack>
    );
  }
  if (superCats.length === 0) return null;

  const tabs: Tab[] = [{ id: 'all', slug: '', name: 'All' }, ...superCats];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}
    >
      {tabs.map((tab) => {
        const selected = selectedSlug === tab.slug;
        return (
          <XStack
            key={tab.id}
            testID={`super-cat-${tab.slug || 'all'}`}
            role="button"
            aria-label={tab.name}
            aria-selected={selected}
            onPress={() => select(tab.slug)}
            height={38}
            paddingHorizontal={14}
            borderRadius={14}
            overflow="hidden"
            alignItems="center"
            gap={6}
            borderWidth={1}
            borderColor={selected ? 'transparent' : '$borderColor'}
            backgroundColor={selected ? 'transparent' : '$surface'}
            pressStyle={{ opacity: 0.85 }}
          >
            {selected ? (
              <LinearGradient
                colors={['#ff4f73', '#ff7a59', '#f5337a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {tab.icon ? (
              <Text fontSize={14}>{tab.icon}</Text>
            ) : tab.slug === '' ? (
              <MaterialIcons name="apps" size={15} color={selected ? '#ffffff' : '#9aa0aa'} />
            ) : null}
            <Text fontSize={13} fontWeight="900" color={selected ? '#ffffff' : '$color'}>
              {tab.name}
            </Text>
          </XStack>
        );
      })}
    </ScrollView>
  );
}
