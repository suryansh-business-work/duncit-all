import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { VenueCard } from '@/components/hosts-venues';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useVenuesExplore, type VenueCategoryOption } from '@/hooks/useVenuesExplore';
import type { RootStackParamList } from '@/navigation/types';

/** Horizontal Super-category chip rail — "All" clears the filter. */
function CategoryChips({
  categories,
  selectedId,
  primary,
  onSelect,
}: Readonly<{
  categories: VenueCategoryOption[];
  selectedId: string;
  primary: string;
  onSelect: (id: string) => void;
}>) {
  if (categories.length === 0) return null;
  const chips = [{ id: '', name: 'All' }, ...categories];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap={8} paddingVertical={2}>
        {chips.map((c) => {
          const selected = selectedId === c.id;
          return (
            <YStack
              key={c.id || 'all'}
              testID={`venues-cat-${c.id || 'all'}`}
              role="button"
              onPress={() => onSelect(c.id)}
              paddingHorizontal={12}
              paddingVertical={7}
              borderRadius={999}
              borderWidth={1}
              borderColor={selected ? primary : '$borderColor'}
              backgroundColor={selected ? primary : 'transparent'}
            >
              <Text fontSize={13} fontWeight="800" color={selected ? 'white' : '$color'}>
                {c.name}
              </Text>
            </YStack>
          );
        })}
      </XStack>
    </ScrollView>
  );
}

/** Venues discovery — venues in the selected location with a server-side
 * debounced search + Super-category filter. mWeb twin: /venues (VenuesPage). */
export function VenuesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { primary, muted } = useThemeColors();
  const {
    venues,
    categories,
    cityLabel,
    searchInput,
    setSearchInput,
    superCategoryId,
    setSuperCategoryId,
    isLoading,
    error,
  } = useVenuesExplore();

  return (
    <StackScreen title="Venues" testID="venues-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={12} padding={16} paddingBottom={40}>
          {cityLabel ? (
            <XStack alignItems="center" gap={4}>
              <MaterialIcons name="place" size={14} color={muted} />
              <Text fontSize={12.5} fontWeight="700" color="$muted">
                Venues in {cityLabel}
              </Text>
            </XStack>
          ) : null}
          <Input
            testID="venues-search"
            aria-label="Search venues"
            placeholder="Search venues by name, type or area"
            placeholderTextColor="$muted"
            value={searchInput}
            onChangeText={setSearchInput}
            backgroundColor="$surface"
          />
          <CategoryChips
            categories={categories}
            selectedId={superCategoryId}
            primary={primary}
            onSelect={setSuperCategoryId}
          />
          {isLoading ? <Spinner testID="venues-loading" color="$primary" /> : null}
          {!isLoading && error ? (
            <Text testID="venues-error" fontSize={13} color="$danger">
              Could not load venues — please try again.
            </Text>
          ) : null}
          {!isLoading && !error && venues.length === 0 ? (
            <Text testID="venues-empty" fontSize={13} color="$muted">
              No venues found here yet — try another search or category.
            </Text>
          ) : null}
          {venues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onOpen={() => navigation.navigate('VenueDetails', { venueId: venue.id })}
            />
          ))}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
