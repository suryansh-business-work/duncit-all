import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { PodCard } from '@/components/home/PodCard';
import { StackScreen } from '@/components/StackScreen';
import { useDetailNav } from '@/hooks/useDetailNav';
import { usePodSearch } from '@/hooks/usePodSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Empty/prompt state — shown before typing or when nothing matches. */
function SearchHint({
  icon,
  text,
  testID,
}: Readonly<{ icon: 'search' | 'search-off'; text: string; testID: string }>) {
  const { muted } = useThemeColors();
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap={10} padding={32}>
      <MaterialIcons name={icon} size={40} color={muted} />
      <Text testID={testID} color="$muted" textAlign="center">
        {text}
      </Text>
    </YStack>
  );
}

/** Header search — type to find any active pod by title or place, then tap to
 * open its detail page. Mirrors mWeb's pod search. */
export function SearchScreen() {
  const { width } = useWindowDimensions();
  const { muted } = useThemeColors();
  const [query, setQuery] = useState('');
  const { results, hasQuery } = usePodSearch(query);
  const { openPod } = useDetailNav();

  return (
    <StackScreen title="Search" testID="search-screen">
      <XStack
        alignItems="center"
        gap={8}
        margin={16}
        marginBottom={4}
        paddingHorizontal={12}
        height={46}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="search" size={20} color={muted} />
        <Input
          testID="search-input"
          flex={1}
          unstyled
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Search pods…"
          placeholderTextColor="$muted"
          color="$color"
          fontSize={15}
          returnKeyType="search"
        />
      </XStack>

      {!hasQuery ? (
        <SearchHint icon="search" text="Search pods by name or place." testID="search-prompt" />
      ) : null}
      {hasQuery && results.length === 0 ? (
        <SearchHint icon="search-off" text="No pods match your search." testID="search-empty" />
      ) : null}
      {hasQuery && results.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={12} padding={16} paddingBottom={40}>
            {results.map((pod) => (
              <PodCard
                key={pod.id}
                pod={pod}
                width={width - 32}
                onPress={() => openPod(pod.id, pod.pod_title)}
              />
            ))}
          </YStack>
        </ScrollView>
      ) : null}
    </StackScreen>
  );
}
